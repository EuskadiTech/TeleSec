import json
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from ..auth import (
    authenticate_tenant,
    create_tenant,
    get_persona_roles,
    get_personas,
)
from ..models import Document, Tenant, db

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ---------------------------------------------------------------------------
# Step 1 – Authenticate tenant
# ---------------------------------------------------------------------------


@bp.route("/login", methods=["POST"])
def login():
    """Authenticate the tenant (group) and return a tenant-scoped token plus the list of personas."""
    body = request.get_json(force=True) or {}
    tenant_name = (body.get("tenant") or "").strip()
    password = body.get("password") or ""

    if not tenant_name or not password:
        return jsonify({"error": "Tenant y contraseña son requeridos"}), 400

    tenant = authenticate_tenant(tenant_name, password)
    if not tenant:
        return jsonify({"error": "Credenciales incorrectas"}), 401

    personas = get_personas(tenant.id)

    # Issue a short-lived token only valid for the persona-selection step
    tenant_token = create_access_token(
        identity="__tenant__",
        additional_claims={
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "step": "select_persona",
            "roles": [],
        },
    )

    return jsonify(
        {
            "tenant_token": tenant_token,
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "personas": personas,
        }
    )


# ---------------------------------------------------------------------------
# Step 2 – Select persona → full JWT
# ---------------------------------------------------------------------------


@bp.route("/select-persona", methods=["POST"])
@jwt_required()
def select_persona():
    """Exchange a tenant-step token + persona_id for a full access/refresh JWT pair."""
    claims = get_jwt()
    if claims.get("step") != "select_persona":
        return jsonify({"error": "Token incorrecto para este paso"}), 400

    tenant_id = claims["tenant_id"]
    body = request.get_json(force=True) or {}
    persona_id = (body.get("persona_id") or "").strip()

    if not persona_id:
        return jsonify({"error": "persona_id es requerido"}), 400

    roles = get_persona_roles(tenant_id, persona_id)

    common_claims = {
        "tenant_id": tenant_id,
        "tenant_name": claims.get("tenant_name", ""),
        "roles": roles,
    }

    access_token = create_access_token(identity=persona_id, additional_claims=common_claims)
    refresh_token = create_refresh_token(identity=persona_id, additional_claims=common_claims)

    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "persona_id": persona_id,
            "roles": roles,
            "tenant_id": tenant_id,
            "tenant_name": claims.get("tenant_name", ""),
        }
    )


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------


@bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    access_token = create_access_token(
        identity=identity,
        additional_claims={
            "tenant_id": claims.get("tenant_id"),
            "tenant_name": claims.get("tenant_name", ""),
            "roles": claims.get("roles", []),
        },
    )
    return jsonify({"access_token": access_token})


# ---------------------------------------------------------------------------
# Register new tenant (initial setup / onboarding)
# ---------------------------------------------------------------------------


@bp.route("/register-tenant", methods=["POST"])
def register_tenant():
    """Create a new tenant. Open endpoint – protect with network rules in production."""
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    password = (body.get("password") or "").strip()

    if not name or not password:
        return jsonify({"error": "Nombre y contraseña son requeridos"}), 400
    if len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400

    try:
        Tenant.get(Tenant.name == name)
        return jsonify({"error": "Ya existe un tenant con ese nombre"}), 409
    except Tenant.DoesNotExist:
        pass

    tenant = create_tenant(name, password)
    return jsonify({"id": tenant.id, "name": tenant.name}), 201


# ---------------------------------------------------------------------------
# Bootstrap first admin persona (used during onboarding when no personas exist)
# ---------------------------------------------------------------------------


@bp.route("/bootstrap-admin", methods=["POST"])
@jwt_required()
def bootstrap_admin():
    """Create the first admin persona for a tenant.

    Requires a tenant-step token (step == 'select_persona').
    Only succeeds when the tenant currently has **zero** personas.
    """
    claims = get_jwt()
    if claims.get("step") != "select_persona":
        return jsonify({"error": "Token incorrecto para este paso"}), 400

    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        return jsonify({"error": "No tenant context"}), 400

    # Guard: only allow when no personas exist yet
    existing_count = (
        Document.select()
        .where(
            (Document.tenant_id == tenant_id)
            & (Document.table_name == "personas")
            & (Document.deleted == False)  # noqa: E712
        )
        .count()
    )
    if existing_count > 0:
        return jsonify({"error": "El tenant ya tiene personas; usa el login normal"}), 409

    body = request.get_json(force=True) or {}
    persona_id = (body.get("persona_id") or "").strip()
    nombre = (body.get("Nombre") or "Admin").strip()
    roles = (body.get("Roles") or "ADMIN,").strip()

    if not persona_id:
        return jsonify({"error": "persona_id es requerido"}), 400

    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    data = {
        "Nombre": nombre,
        "Roles": roles,
        "Region": "",
        "Monedero_Balance": 0,
        "markdown": "Cuenta de administrador creada durante el onboarding",
    }

    with db.atomic():
        Document.create(
            id=f"personas:{persona_id}",
            tenant_id=tenant_id,
            table_name="personas",
            data=json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            deleted=False,
            updated_at=now,
        )

    return jsonify({"ok": True, "persona_id": persona_id}), 201
