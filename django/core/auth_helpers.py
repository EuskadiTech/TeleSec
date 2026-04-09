"""Auth helpers – ported from the Flask backend."""
import json
import uuid
from datetime import datetime, timezone

import bcrypt

from .models import Document, Tenant


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Tenant operations
# ---------------------------------------------------------------------------


def create_tenant(name: str, password: str) -> Tenant:
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return Tenant.objects.create(
        id=str(uuid.uuid4()),
        name=name,
        password_hash=hash_password(password),
        created_at=now,
    )


def authenticate_tenant(name: str, password: str):
    """Return a Tenant if credentials are valid, else None."""
    try:
        tenant = Tenant.objects.get(name=name)
        if verify_password(password, tenant.password_hash):
            return tenant
        return None
    except Tenant.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# Persona helpers (stored in the documents table)
# ---------------------------------------------------------------------------


def get_personas(tenant_id: str) -> list:
    docs = Document.objects.filter(
        tenant_id=tenant_id,
        table_name="personas",
        deleted=False,
    )
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


def get_persona_roles(tenant_id: str, persona_id: str) -> list:
    """Return list of role strings for a persona within a tenant."""
    try:
        doc = Document.objects.get(
            id=f"personas:{persona_id}",
            tenant_id=tenant_id,
            deleted=False,
        )
        data = json.loads(doc.data)
        roles_str = data.get("Roles", "")
        return [r.strip() for r in roles_str.split(",") if r.strip()]
    except Document.DoesNotExist:
        return []
