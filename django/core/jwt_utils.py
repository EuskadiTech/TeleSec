"""JWT creation and decoding helpers using PyJWT (no Django User model needed)."""
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(identity: str, additional_claims: dict | None = None) -> str:
    lifetime: timedelta = settings.JWT_ACCESS_TOKEN_LIFETIME
    payload = {
        "sub": identity,
        "iat": _now(),
        "exp": _now() + lifetime,
        "type": "access",
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def create_refresh_token(identity: str, additional_claims: dict | None = None) -> str:
    lifetime: timedelta = settings.JWT_REFRESH_TOKEN_LIFETIME
    payload = {
        "sub": identity,
        "iat": _now(),
        "exp": _now() + lifetime,
        "type": "refresh",
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and verify a JWT; raises jwt.InvalidTokenError on failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
