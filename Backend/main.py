import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from PIL import Image

from billing import (
    PLAN_PRICES_CENTS,
    apply_stripe_checkout_completed,
    can_mint,
    create_stripe_checkout_url,
    get_or_create_user,
    record_mint,
    register_user,
    set_user_plan,
    user_has_hd,
)
from auth_jwt import TokenUser, get_optional_user
from watermark import apply_watermark

UPLOAD_DIR = Path("uploads")
ORIGINAL_DIR = UPLOAD_DIR / "original"
WATERMARKED_DIR = UPLOAD_DIR / "watermarked"

for folder in (ORIGINAL_DIR, WATERMARKED_DIR):
    folder.mkdir(parents=True, exist_ok=True)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

HD_PRICE_CENTS = int(os.getenv("HD_PRICE_CENTS", "499"))

app = FastAPI(
    title="Mint My Face API",
    description="Save designs, serve watermarked previews, and unlock HD downloads after payment.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

designs_db: dict[str, dict] = {}
payments_db: dict[str, str] = {}


class DesignCreateResponse(BaseModel):
    design_id: str
    message: str
    preview_url: str


class DesignStatusResponse(BaseModel):
    design_id: str
    paid: bool
    preview_url: str
    hd_price_cents: int
    can_download_hd: bool


class PaymentIntentResponse(BaseModel):
    client_secret: str
    design_id: str
    amount_cents: int
    currency: str


class PaymentConfirmResponse(BaseModel):
    status: str
    design_id: str
    download_url: str


class BillingCheckoutRequest(BaseModel):
    plan: str
    email: str


class BillingCheckoutResponse(BaseModel):
    checkout_url: str
    plan: str


class UserPlanResponse(BaseModel):
    email: str
    plan: str
    mint_count_today: int
    daily_limit: int | None
    hd_access: bool


class ActivatePlanRequest(BaseModel):
    plan: str
    email: str


class UserRegisterRequest(BaseModel):
    email: str
    name: str | None = None
    provider: str = "google"


class UserRegisterResponse(BaseModel):
    email: str
    name: str | None
    plan: str
    is_new: bool


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Mint My Face API is running",
        "hd_price_cents": HD_PRICE_CENTS,
    }


FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


@app.post("/api/users/register", response_model=UserRegisterResponse)
async def register_user_endpoint(body: UserRegisterRequest):
    """Called after Google OAuth — creates free account on first sign-in."""
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Valid email required")
    user, is_new = register_user(body.email, body.name, body.provider)
    return {
        "email": user["email"],
        "name": user.get("name"),
        "plan": user.get("plan", "free"),
        "is_new": is_new,
    }


@app.get("/api/users/me", response_model=UserPlanResponse)
async def get_user_plan(email: str):
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    user = get_or_create_user(email)
    plan = user.get("plan", "free")
    limits = {"free": 3, "starter": 5, "pro": None}
    return {
        "email": user["email"],
        "plan": plan,
        "mint_count_today": user.get("mint_count", 0),
        "daily_limit": limits.get(plan),
        "hd_access": user_has_hd(email),
    }


@app.post("/api/billing/checkout", response_model=BillingCheckoutResponse)
async def billing_checkout(body: BillingCheckoutRequest):
    plan = body.plan.lower().strip()
    if plan not in PLAN_PRICES_CENTS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    url = create_stripe_checkout_url(plan, body.email, FRONTEND_URL)
    return {"checkout_url": url, "plan": plan}


@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook — set plan after checkout.session.completed."""
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=501, detail="STRIPE_WEBHOOK_SECRET not configured")

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        import stripe

        stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if event["type"] == "checkout.session.completed":
        apply_stripe_checkout_completed(event["data"]["object"])

    return {"received": True}


@app.post("/api/billing/activate")
async def activate_plan(body: ActivatePlanRequest):
    """Mock or post-checkout activation (use Stripe webhooks in production)."""
    plan = body.plan.lower().strip()
    if plan not in ("starter", "pro"):
        raise HTTPException(status_code=400, detail="Invalid plan")
    set_user_plan(body.email, plan)
    return {"status": "ok", "plan": plan}


def _email_from_auth(auth_user: TokenUser | None, x_user_email: str | None) -> str | None:
    if auth_user:
        set_user_plan(auth_user["email"], auth_user["plan"])  # type: ignore[arg-type]
        return auth_user["email"]
    return x_user_email.lower().strip() if x_user_email else None


@app.post("/api/designs", response_model=DesignCreateResponse)
async def save_design(
    image: UploadFile = File(...),
    auth_user: TokenUser | None = Depends(get_optional_user),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
):
    """Save the user's design and generate a watermarked preview."""
    email = _email_from_auth(auth_user, x_user_email)
    if email:
        allowed, plan = can_mint(email)
        if not allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Daily mint limit reached for {plan} plan. Upgrade at /pricing",
            )

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (PNG, JPEG, or WebP)")

    design_id = str(uuid.uuid4())
    original_path = ORIGINAL_DIR / f"{design_id}.png"
    watermarked_path = WATERMARKED_DIR / f"{design_id}.png"

    content = await image.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 15 MB")

    with open(original_path, "wb") as buffer:
        buffer.write(content)

    try:
        apply_watermark(str(original_path), str(watermarked_path))
    except Exception as exc:
        original_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to create preview: {exc}") from exc

    designs_db[design_id] = {
        "id": design_id,
        "original_path": str(original_path),
        "watermarked_path": str(watermarked_path),
        "paid": False,
        "owner_email": email,
    }

    if email:
        record_mint(email)

    preview_url = f"/api/designs/{design_id}/preview"
    return {
        "design_id": design_id,
        "message": "Design saved. Download the free preview or unlock HD.",
        "preview_url": preview_url,
    }


@app.get("/api/designs/{design_id}", response_model=DesignStatusResponse)
async def get_design_status(design_id: str):
    design = designs_db.get(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    return {
        "design_id": design_id,
        "paid": design["paid"],
        "preview_url": f"/api/designs/{design_id}/preview",
        "hd_price_cents": HD_PRICE_CENTS,
        "can_download_hd": design["paid"],
    }


@app.get("/api/designs/{design_id}/preview")
async def download_preview(design_id: str):
    """Free watermarked preview — always available."""
    design = designs_db.get(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    path = Path(design["watermarked_path"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Preview file missing")

    return FileResponse(
        path,
        media_type="image/png",
        filename=f"mint-my-face-preview-{design_id[:8]}.png",
    )


@app.post("/api/checkout/{design_id}", response_model=PaymentIntentResponse)
async def create_checkout_session(design_id: str):
    """Create a mock payment intent for HD (unwatermarked) download."""
    if design_id not in designs_db:
        raise HTTPException(status_code=404, detail="Design not found")

    if designs_db[design_id]["paid"]:
        raise HTTPException(status_code=400, detail="HD already unlocked for this design")

    client_secret = f"mock_pi_{uuid.uuid4().hex}"
    payments_db[client_secret] = design_id

    return {
        "client_secret": client_secret,
        "design_id": design_id,
        "amount_cents": HD_PRICE_CENTS,
        "currency": "usd",
    }


@app.post("/api/checkout/confirm/{client_secret}", response_model=PaymentConfirmResponse)
async def confirm_payment(client_secret: str):
    """Mock payment confirmation — marks design as paid."""
    if client_secret not in payments_db:
        raise HTTPException(status_code=400, detail="Invalid or expired payment intent")

    design_id = payments_db.pop(client_secret)
    designs_db[design_id]["paid"] = True

    return {
        "status": "success",
        "design_id": design_id,
        "download_url": f"/api/downloads/{design_id}",
    }


@app.get("/api/designs/{design_id}/preview-standard")
async def download_preview_standard(design_id: str):
    """Free tier — watermarked PNG resized to ~480p width."""
    design = designs_db.get(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    path = Path(design["watermarked_path"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Preview file missing")

    with Image.open(path) as img:
        w, h = img.size
        target_w = 854
        if w > target_w:
            target_h = int(h * (target_w / w))
            img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        out_path = WATERMARKED_DIR / f"{design_id}_std.png"
        img.convert("RGB").save(out_path, format="PNG", optimize=True)

    return FileResponse(
        out_path,
        media_type="image/png",
        filename=f"mint-my-face-standard-{design_id[:8]}.png",
    )


@app.get("/api/downloads/{design_id}")
async def download_hd(
    design_id: str,
    auth_user: TokenUser | None = Depends(get_optional_user),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
):
    """Download the full-resolution unwatermarked design after payment or Pro plan."""
    design = designs_db.get(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    email = _email_from_auth(auth_user, x_user_email)
    has_pro = (auth_user and auth_user["plan"] == "pro") or (
        user_has_hd(email) if email else False
    )
    if not design["paid"] and not has_pro:
        raise HTTPException(
            status_code=403,
            detail="Login required. Upgrade to Pro or unlock HD for this design.",
        )

    path = Path(design["original_path"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Design file missing")

    return FileResponse(
        path,
        media_type="image/png",
        filename=f"mint-my-face-hd-{design_id[:8]}.png",
    )
