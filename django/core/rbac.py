"""RBAC helpers – table-level access/edit permissions."""
from rest_framework.permissions import BasePermission

# Maps table_name → roles that grant write access.
# ADMIN always bypasses; unknown tables deny by default.
TABLE_EDIT_ROLES: dict[str, list[str]] = {
    "materiales": ["MATERIALES_EDIT"],
    "personas": ["PERSONAS_EDIT"],
    "supercafe": ["SUPERCAFE_EDIT"],
    "comedor": ["COMEDOR_EDIT"],
    "notificaciones": ["NOTIFICACIONES_EDIT"],
    "resumen_diario": ["RESUMEN_DIARIO_EDIT"],
    "pagos": ["PAGOS_EDIT"],
    "notas": ["NOTAS_EDIT"],
    "aulas_solicitudes": ["AULAS_EDIT"],
    "aulas_informes": ["AULAS_EDIT"],
    "asistencia": ["ASISTENCIA_EDIT"],
    "panel": ["PANEL_EDIT"],
    "config": ["ADMIN"],
}

TABLE_ACCESS_ROLES: dict[str, list[str]] = {
    "materiales": ["MATERIALES_EDIT", "MATERIALES_ACCESS"],
    "personas": ["*"],
    "supercafe": ["SUPERCAFE_EDIT", "SUPERCAFE_ACCESS"],
    "comedor": ["COMEDOR_EDIT", "COMEDOR_ACCESS"],
    "notificaciones": ["NOTIFICACIONES_EDIT", "NOTIFICACIONES_ACCESS"],
    "resumen_diario": ["RESUMEN_DIARIO_EDIT", "RESUMEN_DIARIO_ACCESS"],
    "pagos": ["PAGOS_EDIT", "PAGOS_ACCESS"],
    "notas": ["NOTAS_EDIT", "NOTAS_ACCESS"],
    "aulas_solicitudes": ["AULAS_EDIT", "AULAS_ACCESS"],
    "aulas_informes": ["AULAS_EDIT", "AULAS_ACCESS"],
    "asistencia": ["ASISTENCIA_EDIT", "ASISTENCIA_ACCESS"],
    "panel": ["PANEL_EDIT", "PANEL_ACCESS"],
    "config": ["ADMIN"],
}


def can_edit_table(table_name: str, roles: list) -> bool:
    if "ADMIN" in roles:
        return True
    required = TABLE_EDIT_ROLES.get(str(table_name or "").lower())
    if required is None:
        return False
    return any(r in roles for r in required)


def can_access_table(table_name: str, roles: list) -> bool:
    if "ADMIN" in roles:
        return True
    required = TABLE_ACCESS_ROLES.get(str(table_name or "").lower())
    if required is None:
        return False
    if "*" in required:
        return True
    return any(r in roles for r in required)


# ---------------------------------------------------------------------------
# DRF permission classes
# ---------------------------------------------------------------------------


class IsPersonaAuthenticated(BasePermission):
    """Requires a full persona-level JWT (not the intermediate select_persona step)."""

    message = "Se requiere autenticación de persona."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "step", "") == "select_persona":
            return False
        return bool(getattr(user, "persona_id", ""))


class IsSelectPersonaStep(BasePermission):
    """Requires the intermediate tenant-step token (step == select_persona)."""

    message = "Se requiere token de selección de persona."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        return getattr(user, "step", "") == "select_persona"
