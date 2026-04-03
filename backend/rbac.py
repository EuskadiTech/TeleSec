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


# ---------------------------------------------------------------------------
# Table-level edit permissions
# ---------------------------------------------------------------------------

# Maps table_name (lowercase) → roles that grant write access to that table.
# ADMIN always bypasses these checks.
# Tables not listed here are restricted to ADMIN only.
TABLE_EDIT_ROLES: dict[str, list[str]] = {
    "materiales": ["MATERIALES_EDIT"],
    "personas": ["PERSONAS_EDIT"],
    "supercafe": ["SUPERCAFE_EDIT"],
    "comedor": ["COMEDOR_EDIT"],
    "notificaciones": ["NOTIFICACIONES_EDIT"],
    "resumen_diario": ["RESUMEN_DIARIO_EDIT"],
}
TABLE_ACCESS_ROLES: dict[str, list[str]] = {
    "materiales": ["MATERIALES_EDIT", "MATERIALES_ACCESS"],
    "personas": ["PERSONAS_EDIT", "PERSONAS_ACCESS"],
    "supercafe": ["SUPERCAFE_EDIT", "SUPERCAFE_ACCESS"],
    "comedor": ["COMEDOR_EDIT", "COMEDOR_ACCESS"],
    "notificaciones": ["NOTIFICACIONES_EDIT", "NOTIFICACIONES_ACCESS"],
    "resumen_diario": ["RESUMEN_DIARIO_EDIT", "RESUMEN_DIARIO_ACCESS"],
}


def can_edit_table(table_name: str, roles: list) -> bool:
    """Return True if *roles* grant edit access to *table_name*.

    ADMIN always passes.  Tables not present in TABLE_EDIT_ROLES are
    restricted to ADMIN only (deny-by-default for unknown tables).
    """
    if "ADMIN" in roles:
        return True
    required = TABLE_EDIT_ROLES.get(str(table_name or "").lower())
    if required is None:
        return False
    return any(r in roles for r in required)
def can_access_table(table_name: str, roles: list) -> bool:
    """Return True if *roles* grant any access to *table_name*.

    ADMIN always passes.  Tables not present in TABLE_EDIT_ROLES are
    restricted to ADMIN only (deny-by-default for unknown tables).
    """
    if "ADMIN" in roles:
        return True
    required = TABLE_EDIT_ROLES.get(str(table_name or "").lower())
    if required is None:
        return False
    return any(r in roles for r in required)