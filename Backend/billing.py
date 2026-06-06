"""User plans, daily image limits, plan expiry, and checkout (Stripe + Paddle)."""

from __future__ import annotations
import hashlib
import hmac
import os
import uuid
from datetime import date, datetime, timedelta
from typing import Literal

PlanId = Literal["free", "starter", "pro"]

PLAN_PRICES_CENTS = {
    "starter": 200,
    "pro": 500,
}

# Max images per calendar day (None = unlimited while paid plan is active)
DAILY_IMAGE_LIMITS: dict[PlanId, int | None] = {
    "free": 1,
    "starter": 5,
    "pro": None,
}

users_db: dict[str, dict] = {}


def _today() -> str:
    return date.today().isoformat()


def _now() -> datetime:
    return datetime.utcnow()


def compute_plan_expires_at(plan: PlanId, from_dt: datetime | None = None) -> datetime | None:
    start = from_dt or _now()
    if plan == "starter":
        return start + timedelta(hours=24)
    if plan == "pro":
        return start + timedelta(days=30)
    return None


def _parse_expires(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def effective_plan(user: dict) -> PlanId:
    plan: PlanId = user.get("plan", "free")
    if plan not in ("starter", "pro"):
        return "free"
    expires = _parse_expires(user.get("plan_expires_at"))
    if expires and _now() > expires:
        return "free"
    return plan


def get_or_create_user(email: str) -> dict:
    key = email.lower().strip()
    if key not in users_db:
        users_db[key] = {
            "email": key,
            "plan": "free",
            "plan_expires_at": None,
            "mint_day": _today(),
            "mint_count": 0,
            "name": None,
            "provider": "google",
            "created_at": _today(),
        }
    return users_db[key]


def register_user(
    email: str,
    name: str | None = None,
    provider: str = "google",
) -> tuple[dict, bool]:
    key = email.lower().strip()
    if key in users_db:
        if name and not users_db[key].get("name"):
            users_db[key]["name"] = name
        return users_db[key], False

    users_db[key] = {
        "email": key,
        "name": name,
        "provider": provider,
        "plan": "free",
        "plan_expires_at": None,
        "mint_day": _today(),
        "mint_count": 0,
        "created_at": _today(),
    }
    return users_db[key], True


def get_user_plan(email: str) -> PlanId:
    user = get_or_create_user(email)
    return effective_plan(user)


def can_mint(email: str | None) -> tuple[bool, str]:
    """Check if user can save another image today (legacy name: can_mint)."""
    if not email:
        return True, "anonymous"

    user = get_or_create_user(email)
    if user["mint_day"] != _today():
        user["mint_day"] = _today()
        user["mint_count"] = 0

    plan = effective_plan(user)
    limit = DAILY_IMAGE_LIMITS.get(plan)

    if limit is None:
        return True, plan

    if user["mint_count"] >= limit:
        return False, plan

    return True, plan


def record_mint(email: str | None) -> None:
    if not email:
        return
    user = get_or_create_user(email)
    if user["mint_day"] != _today():
        user["mint_day"] = _today()
        user["mint_count"] = 0
    user["mint_count"] += 1


def set_user_plan(email: str, plan: PlanId) -> dict:
    user = get_or_create_user(email)
    user["plan"] = plan
    expires = compute_plan_expires_at(plan)
    user["plan_expires_at"] = expires.isoformat() if expires else None
    return user


def user_has_hd(email: str | None) -> bool:
    if not email:
        return False
    user = get_or_create_user(email)
    return effective_plan(user) == "pro"


def _stripe_price_id(plan: str) -> str | None:
    """Return a Stripe Price ID only when it looks valid (price_…)."""
    key = f"STRIPE_PRICE_{plan.upper()}"
    raw = os.getenv(key, "").strip()
    if raw.startswith("price_"):
        return raw
    return None


def _checkout_line_items(plan: PlanId) -> tuple[list[dict], str]:
    price_id = _stripe_price_id(plan)
    if price_id:
        return [{"price": price_id, "quantity": 1}], "payment"
    return (
        [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": PLAN_PRICES_CENTS[plan],
                    "product_data": {"name": f"Mint My Face — {plan.title()}"},
                },
                "quantity": 1,
            }
        ],
        "payment",
    )


def create_stripe_checkout_url(plan: PlanId, email: str, base_url: str) -> str:
    secret = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not secret or plan not in PLAN_PRICES_CENTS:
        token = uuid.uuid4().hex[:12]
        return f"{base_url}/pricing?checkout=mock&plan={plan}&token={token}"

    try:
        import stripe

        stripe.api_key = secret
        line_items, mode = _checkout_line_items(plan)

        session = stripe.checkout.Session.create(
            mode=mode,
            customer_email=email,
            line_items=line_items,
            success_url=f"{base_url}/pricing?success={plan}",
            cancel_url=f"{base_url}/pricing?canceled=1",
            metadata={"plan": plan, "email": email},
        )
        return session.url or f"{base_url}/pricing"
    except Exception as exc:
        print(f"[billing] Stripe checkout failed for {plan}: {exc}")
        return f"{base_url}/pricing?checkout=error&plan={plan}"


def apply_stripe_checkout_completed(session: dict) -> bool:
    metadata = session.get("metadata") or {}
    email = (metadata.get("email") or "").lower().strip()
    plan = (metadata.get("plan") or "").lower().strip()
    if not email or plan not in ("starter", "pro"):
        return False
    set_user_plan(email, plan)  # type: ignore[arg-type]
    return True


# =============================================================================
# Paddle (Merchant of Record) — works in Pakistan, payout via Payoneer.
# Frontend opens the Paddle.js overlay; this module only verifies the webhook
# and activates the plan. The plan is derived from the paid Price ID (server
# side, tamper-proof) — never from client-supplied data.
# =============================================================================

def paddle_plan_for_price(price_id: str) -> PlanId | None:
    """Map a Paddle Price ID back to one of our plans via env config."""
    price_id = (price_id or "").strip()
    if not price_id:
        return None
    if price_id == os.getenv("PADDLE_PRICE_STARTER", "").strip():
        return "starter"
    if price_id == os.getenv("PADDLE_PRICE_PRO", "").strip():
        return "pro"
    return None


def verify_paddle_signature(raw_body: bytes, signature_header: str) -> bool:
    """Verify a Paddle webhook using the destination's secret key.

    Header format: ``ts=<unix>;h1=<hex-hmac-sha256>``.
    Signed payload is ``<ts>:<raw_body>`` keyed with PADDLE_WEBHOOK_SECRET.
    """
    secret = os.getenv("PADDLE_WEBHOOK_SECRET", "").strip()
    if not secret or not signature_header:
        return False

    parts = dict(
        piece.split("=", 1)
        for piece in signature_header.split(";")
        if "=" in piece
    )
    ts = parts.get("ts", "")
    received = parts.get("h1", "")
    if not ts or not received:
        return False

    signed_payload = f"{ts}:".encode() + raw_body
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


def apply_paddle_transaction_completed(data: dict) -> bool:
    """Activate a plan from a completed Paddle transaction payload.

    ``plan`` comes from the paid Price ID (trusted). ``email`` comes from the
    checkout's custom_data, falling back to the transaction's customer details.
    """
    items = data.get("items") or []
    plan: PlanId | None = None
    for item in items:
        price = (item or {}).get("price") or {}
        plan = paddle_plan_for_price(price.get("id", ""))
        if plan:
            break

    custom = data.get("custom_data") or {}
    email = (custom.get("email") or "").lower().strip()
    if not email:
        # Fallback: Paddle sometimes nests the email under details/customer.
        details = data.get("details") or {}
        email = (
            (details.get("customer") or {}).get("email")
            or (data.get("customer") or {}).get("email")
            or ""
        ).lower().strip()

    if not email or plan not in ("starter", "pro"):
        return False
    set_user_plan(email, plan)
    return True
