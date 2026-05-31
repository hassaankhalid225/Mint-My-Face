"""Verify JWT access tokens (same secret as Next.js AUTH_SECRET / JWT_SECRET)."""

from __future__ import annotations

import os
from typing import TypedDict

import jwt
from fastapi import Header, HTTPException


class TokenUser(TypedDict):
    sub: str
    email: str
    plan: str
    name: str | None


def _secret() -> str:
    return (
        os.getenv("JWT_SECRET", "").strip()
        or os.getenv("AUTH_SECRET", "").strip()
    )


def decode_access_token(token: str) -> TokenUser | None:
    secret = _secret()
    if not secret:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        email = (payload.get("email") or "").lower().strip()
        sub = payload.get("sub") or ""
        if not email or not sub:
            return None
        return {
            "sub": sub,
            "email": email,
            "plan": (payload.get("plan") or "free").lower(),
            "name": payload.get("name"),
        }
    except jwt.PyJWTError:
        return None


async def get_optional_user(
    authorization: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> TokenUser | None:
    if authorization and authorization.lower().startswith("bearer "):
        user = decode_access_token(authorization[7:].strip())
        if user:
            return user
    if x_user_email:
        return {
            "sub": "",
            "email": x_user_email.lower().strip(),
            "plan": "free",
            "name": None,
        }
    return None


async def require_user(
    authorization: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> TokenUser:
    user = await get_optional_user(authorization, x_user_email)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Log in and retry.",
        )
    return user
