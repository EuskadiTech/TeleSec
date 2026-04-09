"""Auth API views – single-instance (no multi-tenant).

Flow:
  POST /api/auth/login          { password }  → persona list + step token
  POST /api/auth/select-persona { persona_id } (step token) → access + refresh JWT
  POST /api/auth/refresh        (refresh token) → new access token
  POST /api/auth/bootstrap-admin { persona_id, Nombre? }  → create first admin
"""
import json
import uuid
from datetime import datetime, timezone

from django.conf import settings
from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from ..auth_helpers import (
    bootstrap_admin_persona,
    get_persona_roles,
    get_personas,
    verify_instance_password,
)
from ..jwt_utils import create_access_token, create_refresh_token, decode_token
from ..models import Document
from ..rbac import IsPersonaAuthenticated, IsSelectPersonaStep

import jwt as _jwt


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Step 1 – verify instance password → return persona list + step token
# ---------------------------------------------------------------------------


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        body = request.data
        password = body.get("password", "")

        if not verify_instance_password(password):
            return Response({"error": "Contraseña incorrecta"}, status=401)

        personas = get_personas()

        step_token = create_access_token(
            identity="__step__",
            additional_claims={"step": "select_persona", "roles": []},
        )

        return Response(
            {
                "step_token": step_token,
                "instance_name": getattr(settings, "INSTANCE_NAME", "TeleSec"),
                "personas": personas,
            }
        )


# ---------------------------------------------------------------------------
# Step 2 – select persona → full JWT pair
# ---------------------------------------------------------------------------


class SelectPersonaView(APIView):
    permission_classes = [IsSelectPersonaStep]

    def post(self, request):
        persona_id = (request.data.get("persona_id") or "").strip()
        if not persona_id:
            return Response({"error": "persona_id es requerido"}, status=400)

        roles = get_persona_roles(persona_id)
        claims = {"roles": roles}

        access_token = create_access_token(identity=persona_id, additional_claims=claims)
        refresh_token = create_refresh_token(identity=persona_id, additional_claims=claims)

        return Response(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "persona_id": persona_id,
                "roles": roles,
            }
        )


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        token = (request.data.get("refresh_token") or "").strip()
        if not token:
            return Response({"error": "refresh_token es requerido"}, status=400)
        try:
            claims = decode_token(token)
        except _jwt.ExpiredSignatureError:
            return Response({"error": "Token expirado"}, status=401)
        except _jwt.InvalidTokenError as exc:
            return Response({"error": f"Token inválido: {exc}"}, status=401)

        if claims.get("type") != "refresh":
            return Response({"error": "Token de tipo incorrecto"}, status=400)

        persona_id = claims.get("sub", "")
        roles = get_persona_roles(persona_id)
        new_access = create_access_token(identity=persona_id, additional_claims={"roles": roles})
        return Response({"access_token": new_access})


# ---------------------------------------------------------------------------
# Bootstrap – create first admin persona (called when no personas exist)
# ---------------------------------------------------------------------------


class BootstrapAdminView(APIView):
    permission_classes = [IsSelectPersonaStep]

    def post(self, request):
        existing = Document.objects.filter(table_name="personas", deleted=False).count()
        if existing > 0:
            return Response(
                {"error": "Ya existen personas; usa el login normal"}, status=409
            )

        body = request.data
        persona_id = (body.get("persona_id") or str(uuid.uuid4())).strip()
        nombre = (body.get("Nombre") or "Admin").strip()
        roles = (body.get("Roles") or "ADMIN,").strip()

        bootstrap_admin_persona(persona_id, nombre, roles)
        return Response({"ok": True, "persona_id": persona_id}, status=201)
