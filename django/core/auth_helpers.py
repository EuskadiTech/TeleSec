"""Auth helpers – single-instance (no multi-tenancy)."""
import json
import uuid
from datetime import datetime, timezone

import bcrypt
from django.conf import settings

from .models import Document


# ---------------------------------------------------------------------------
# Instance password
# ---------------------------------------------------------------------------


def verify_instance_password(password: str) -> bool:
    """Check password against INSTANCE_PASSWORD setting.

    If INSTANCE_PASSWORD is empty the check always passes (dev mode).
    """
    expected = getattr(settings, "INSTANCE_PASSWORD", "")
    if not expected:
        return True
    return password == expected


# ---------------------------------------------------------------------------
# Persona helpers (stored in the documents table, table_name='personas')
# ---------------------------------------------------------------------------


def get_personas() -> list:
    docs = Document.objects.filter(table_name="personas", deleted=False)
    out = []
    for doc in docs:
        try:
            data = json.loads(doc.data)
            if data.get("Oculto"):
                continue
            item_id = doc.id.split(":", 1)[1] if ":" in doc.id else doc.id
            out.append(
                {
                    "id": item_id,
                    "Nombre": data.get("Nombre", ""),
                    "Region": data.get("Region", ""),
                    "Roles": data.get("Roles", ""),
                }
            )
        except Exception:
            pass
    return out


def get_persona_roles(persona_id: str) -> list:
    """Return list of role strings for a persona."""
    try:
        doc = Document.objects.get(
            id=f"personas:{persona_id}",
            deleted=False,
        )
        data = json.loads(doc.data)
        roles_str = data.get("Roles", "")
        return [r.strip() for r in roles_str.split(",") if r.strip()]
    except Document.DoesNotExist:
        return []


# ---------------------------------------------------------------------------
# Bootstrap: create first admin persona when no personas exist
# ---------------------------------------------------------------------------


def bootstrap_admin_persona(persona_id: str, nombre: str = "Admin", roles: str = "ADMIN,") -> Document:
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    data = {
        "Nombre": nombre,
        "Roles": roles,
        "Region": "",
        "Monedero_Balance": 0,
        "markdown": "Cuenta de administrador creada durante el primer arranque.",
    }
    import json as _json
    doc, _ = Document.objects.get_or_create(
        id=f"personas:{persona_id}",
        defaults={
            "table_name": "personas",
            "data": _json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            "deleted": False,
            "updated_at": now,
        },
    )
    return doc
