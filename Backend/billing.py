"""User plans, daily limits, and Stripe checkout (optional)."""

from __future__ import annotations

import os
import uuid
from datetime import date
from typing import Literal

PlanId = Literal["free", "starter", "pro"]

PLAN_PRICES_CENTS = {
    "starter": 200,
    "pro": 500,
}

users_db: dict[str, dict] = {}


def _today() -> str:
    return date.today().isoformat()


def get_or_create_user(email: str) -> dict:
    key = email.lower().strip()
    if key not in users_db:
        users_db[key] = {
            "email": key,
            "plan": "free",
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
    """Create account on first Google sign-in; return (user, is_new)."""
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
        "mint_day": _today(),
        "mint_count": 0,
        "created_at": _today(),
    }
    return users_db[key], True


def get_user_plan(email: str) -> PlanId:
    user = get_or_create_user(email)
    return user.get("plan", "free")


def can_mint(email: str | None) -> tuple[bool, str]:
    if not email:
        return True, "anonymous"

    user = get_or_create_user(email)
    if user["mint_day"] != _today():
        user["mint_day"] = _today()
        user["mint_count"] = 0

    plan: PlanId = user.get("plan", "free")
    limits = {"free": 3, "starter": 5, "pro": None}
    limit = limits.get(plan)

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
    return user


def user_has_hd(email: str | None) -> bool:
    if not email:
        return False
    return get_user_plan(email) == "pro"


def _stripe_price_id(plan: str) -> str:
    key = f"STRIPE_PRICE_{plan.upper()}"
    return os.getenv(key, "").strip()


def create_stripe_checkout_url(plan: PlanId, email: str, base_url: str) -> str:
    secret = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not secret or plan not in PLAN_PRICES_CENTS:
        token = uuid.uuid4().hex[:12]
        return f"{base_url}/pricing?checkout=mock&plan={plan}&token={token}"

    try:
        import stripe

        stripe.api_key = secret
        price_id = _stripe_price_id(plan)
        is_subscription = plan == "pro" and bool(price_id)

        if price_id:
            line_items = [{"price": price_id, "quantity": 1}]
            mode = "subscription" if is_subscription else "payment"
        else:
            mode = "payment"
            line_items = [
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": PLAN_PRICES_CENTS[plan],
                        "product_data": {"name": f"Mint My Face — {plan.title()}"},
                    },
                    "quantity": 1,
                }
            ]

        session = stripe.checkout.Session.create(
            mode=mode,
            customer_email=email,
            line_items=line_items,
            success_url=f"{base_url}/pricing?success={plan}",
            cancel_url=f"{base_url}/pricing?canceled=1",
            metadata={"plan": plan, "email": email},
        )
        return session.url or f"{base_url}/pricing"
    except Exception:
        return f"{base_url}/pricing?checkout=error&plan={plan}"


def apply_stripe_checkout_completed(session: dict) -> bool:
    """Activate plan from Stripe checkout.session.completed metadata."""
    metadata = session.get("metadata") or {}
    email = (metadata.get("email") or "").lower().strip()
    plan = (metadata.get("plan") or "").lower().strip()
    if not email or plan not in ("starter", "pro"):
        return False
    set_user_plan(email, plan)  # type: ignore[arg-type]
    return True
