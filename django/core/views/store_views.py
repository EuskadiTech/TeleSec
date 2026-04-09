"""Module store views.

GET  /api/store/catalog          → list of all packages in the catalog
GET  /api/store/installed        → list of installed packages on this instance
POST /api/store/install          { package_id, license_key? } → install/activate
POST /api/store/uninstall        { package_id } → deactivate (keeps DB record)
POST /api/store/toggle           { package_id, enabled } → enable/disable

License validation: Keygen.sh
  POST https://api.keygen.sh/v1/accounts/{KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key
  body: { "meta": { "key": "<license_key>" } }
"""
import json
import logging
from datetime import datetime, timezone

import requests
from django.conf import settings
from django.utils import timezone as dj_tz
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import InstalledModule, ModulePackage
from ..rbac import IsPersonaAuthenticated

logger = logging.getLogger(__name__)


def _load_catalog_from_db() -> list[dict]:
    return [
        {
            "package_id": p.package_id,
            "name": p.name,
            "description": p.description,
            "version": p.version,
            "modules": p.modules,
            "bundled": p.bundled,
            "free": p.free,
            "icon": p.icon,
            "keygen_product_id": p.keygen_product_id,
        }
        for p in ModulePackage.objects.all().order_by("name")
    ]


def _installed_map() -> dict[str, InstalledModule]:
    return {im.package.package_id: im for im in InstalledModule.objects.select_related("package")}


def _validate_keygen_license(license_key: str) -> dict:
    """Validate a Keygen.sh license key.

    Returns dict with keys: valid (bool), license_id (str), expires_at (str|None),
    error (str|None).
    """
    account_id = getattr(settings, "KEYGEN_ACCOUNT_ID", "")
    if not account_id:
        return {"valid": False, "error": "KEYGEN_ACCOUNT_ID no configurado"}

    url = f"{settings.KEYGEN_API_URL}/accounts/{account_id}/licenses/actions/validate-key"
    try:
        resp = requests.post(
            url,
            json={"meta": {"key": license_key}},
            headers={"Accept": "application/vnd.api+json"},
            timeout=10,
        )
        body = resp.json()
    except Exception as exc:
        logger.warning("Keygen request failed: %s", exc)
        return {"valid": False, "error": f"Error de conexión con el servidor de licencias: {exc}"}

    meta = body.get("meta", {})
    data = body.get("data") or {}
    attrs = data.get("attributes", {})

    valid = meta.get("valid", False)
    license_id = data.get("id", "")
    expires_at = attrs.get("expiry")  # ISO string or None

    if not valid:
        detail = meta.get("detail") or meta.get("code") or "Licencia inválida"
        return {"valid": False, "error": detail}

    return {"valid": True, "license_id": license_id, "expires_at": expires_at}


def _is_admin(request) -> bool:
    user = getattr(request, "user", None)
    return user and "ADMIN" in getattr(user, "roles", [])


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


class CatalogView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def get(self, request):
        catalog = _load_catalog_from_db()
        installed = _installed_map()

        result = []
        for pkg in catalog:
            inst = installed.get(pkg["package_id"])
            result.append(
                {
                    **pkg,
                    "installed": inst is not None,
                    "enabled": inst.enabled if inst else False,
                    "activated_at": inst.activated_at.isoformat() if inst else None,
                    "expires_at": inst.expires_at.isoformat() if inst and inst.expires_at else None,
                }
            )
        return Response(result)


# ---------------------------------------------------------------------------
# Installed list
# ---------------------------------------------------------------------------


class InstalledView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def get(self, request):
        installed = InstalledModule.objects.select_related("package").filter(enabled=True)
        modules: list[str] = []
        for im in installed:
            modules.extend(im.package.modules)
        return Response({"modules": list(dict.fromkeys(modules))})


# ---------------------------------------------------------------------------
# Install / activate a package
# ---------------------------------------------------------------------------


class InstallView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def post(self, request):
        if not _is_admin(request):
            return Response({"error": "Se requiere rol ADMIN"}, status=403)

        package_id = (request.data.get("package_id") or "").strip()
        license_key = (request.data.get("license_key") or "").strip()

        if not package_id:
            return Response({"error": "package_id es requerido"}, status=400)

        try:
            pkg = ModulePackage.objects.get(package_id=package_id)
        except ModulePackage.DoesNotExist:
            return Response({"error": "Paquete no encontrado en el catálogo"}, status=404)

        # Free/bundled packages don't need a license
        validated_id = ""
        expires_at = None
        if not pkg.free and not pkg.bundled:
            if not license_key:
                return Response(
                    {"error": "Este paquete requiere una clave de licencia"}, status=400
                )
            result = _validate_keygen_license(license_key)
            if not result["valid"]:
                return Response({"error": result["error"]}, status=402)
            validated_id = result.get("license_id", "")
            raw_exp = result.get("expires_at")
            if raw_exp:
                from django.utils.dateparse import parse_datetime
                expires_at = parse_datetime(raw_exp)

        inst, created = InstalledModule.objects.update_or_create(
            package=pkg,
            defaults={
                "license_key": license_key,
                "license_id": validated_id,
                "expires_at": expires_at,
                "enabled": True,
            },
        )

        return Response(
            {
                "ok": True,
                "package_id": pkg.package_id,
                "modules": pkg.modules,
                "created": created,
            },
            status=201 if created else 200,
        )


# ---------------------------------------------------------------------------
# Uninstall (disable)
# ---------------------------------------------------------------------------


class UninstallView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def post(self, request):
        if not _is_admin(request):
            return Response({"error": "Se requiere rol ADMIN"}, status=403)

        package_id = (request.data.get("package_id") or "").strip()
        if not package_id:
            return Response({"error": "package_id es requerido"}, status=400)

        updated = InstalledModule.objects.filter(package__package_id=package_id).update(enabled=False)
        if not updated:
            return Response({"error": "Paquete no instalado"}, status=404)
        return Response({"ok": True})


# ---------------------------------------------------------------------------
# Toggle enabled/disabled
# ---------------------------------------------------------------------------


class ToggleView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def post(self, request):
        if not _is_admin(request):
            return Response({"error": "Se requiere rol ADMIN"}, status=403)

        package_id = (request.data.get("package_id") or "").strip()
        enabled = bool(request.data.get("enabled", True))

        if not package_id:
            return Response({"error": "package_id es requerido"}, status=400)

        updated = InstalledModule.objects.filter(package__package_id=package_id).update(
            enabled=enabled
        )
        if not updated:
            return Response({"error": "Paquete no instalado"}, status=404)
        return Response({"ok": True, "enabled": enabled})
