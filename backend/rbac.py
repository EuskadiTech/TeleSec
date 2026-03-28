from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request


def require_auth(f):
    """Require a valid *persona-level* JWT (not the tenant-selection step token)."""

    @wraps(f)
    def decorated(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("step") == "select_persona":
            return jsonify({"error": "Se requiere seleccionar una persona primero"}), 403
        return f(*args, **kwargs)

    return decorated


def require_role(*roles):
    """Require that the authenticated persona holds at least one of *roles*.
    ADMIN always passes.
    """

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("step") == "select_persona":
                return jsonify({"error": "Se requiere seleccionar una persona primero"}), 403
            user_roles = claims.get("roles", [])
            if "ADMIN" in user_roles or any(r in user_roles for r in roles):
                return f(*args, **kwargs)
            return jsonify(
                {
                    "error": "Permisos insuficientes",
                    "required": list(roles),
                    "has": user_roles,
                }
            ), 403

        return decorated

    return decorator


# ---------------------------------------------------------------------------
# Convenience accessors (call inside a JWT-protected view)
# ---------------------------------------------------------------------------


def get_tenant_id() -> str:
    return get_jwt().get("tenant_id", "")


def get_persona_id() -> str:
    return get_jwt_identity() or ""


def get_roles() -> list:
    return get_jwt().get("roles", [])
