"""Custom DRF authentication backend – validates Bearer JWTs without Django users."""
import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class TeleSecPrincipal:
    """Lightweight principal object attached to request.user inside API views."""

    is_authenticated = True
    is_anonymous = False

    def __init__(self, claims: dict):
        self.claims = claims
        self.persona_id: str = claims.get("sub", "")
        self.roles: list = claims.get("roles", [])
        self.step: str = claims.get("step", "")

    def __str__(self):
        return self.persona_id


class JWTAuthentication(BaseAuthentication):
    """Read a Bearer token from Authorization header and decode it."""

    def authenticate(self, request):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth.split(" ", 1)[1].strip()
        if not token:
            return None
        try:
            claims = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expirado")
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed(f"Token inválido: {exc}")
        return (TeleSecPrincipal(claims), token)

    def authenticate_header(self, request):
        return 'Bearer realm="telesec"'
