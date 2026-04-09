"""Server-side rendered views – login flow and app shell."""
import json

from django.conf import settings
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie

from ..auth_helpers import get_persona_roles, get_personas, verify_instance_password
from ..jwt_utils import create_access_token, create_refresh_token
from ..models import Document, InstalledModule


def _get_enabled_modules() -> list[str]:
    modules: list[str] = []
    for im in InstalledModule.objects.select_related("package").filter(enabled=True):
        modules.extend(im.package.modules)
    return list(dict.fromkeys(modules))  # deduplicated, insertion-ordered


# ---------------------------------------------------------------------------
# Login – step 1: enter instance password
# ---------------------------------------------------------------------------


@ensure_csrf_cookie
def login_view(request):
    if request.session.get("access_token"):
        return redirect("/app/")

    error = None
    personas = None

    if request.method == "POST":
        action = request.POST.get("action", "auth")

        if action == "auth":
            password = request.POST.get("password", "")
            if verify_instance_password(password):
                personas = get_personas()
                request.session["_pending_auth"] = True
            else:
                error = "Contraseña incorrecta"

        elif action == "select_persona":
            if not request.session.get("_pending_auth"):
                return redirect("/")
            persona_id = request.POST.get("persona_id", "").strip()
            if not persona_id:
                error = "Selecciona una persona"
                personas = get_personas()
            else:
                roles = get_persona_roles(persona_id)
                access_token = create_access_token(
                    identity=persona_id, additional_claims={"roles": roles}
                )
                refresh_token = create_refresh_token(
                    identity=persona_id, additional_claims={"roles": roles}
                )
                request.session.pop("_pending_auth", None)
                request.session["access_token"] = access_token
                request.session["refresh_token"] = refresh_token
                request.session["persona_id"] = persona_id
                request.session["roles"] = roles
                return redirect("/app/")

    # If step 1 passed already but page refreshed, re-show persona list
    if request.session.pop("_pending_auth", None):
        personas = get_personas()

    has_personas = Document.objects.filter(table_name="personas", deleted=False).exists()

    return render(
        request,
        "core/login.html",
        {
            "error": error,
            "personas": personas,
            "has_personas": has_personas,
            "instance_name": getattr(settings, "INSTANCE_NAME", "TeleSec"),
            "password_required": bool(getattr(settings, "INSTANCE_PASSWORD", "")),
        },
    )


# ---------------------------------------------------------------------------
# App shell – SSR with JWT injected into the page
# ---------------------------------------------------------------------------


def app_view(request):
    access_token = request.session.get("access_token")
    if not access_token:
        return redirect("/")

    persona_id = request.session.get("persona_id", "")
    roles = request.session.get("roles", [])
    refresh_token = request.session.get("refresh_token", "")

    enabled_modules = _get_enabled_modules()
    api_url = request.build_absolute_uri("/").rstrip("/")

    return render(
        request,
        "core/app.html",
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "persona_id": persona_id,
            "roles_json": json.dumps(roles),
            "enabled_modules_json": json.dumps(enabled_modules),
            "api_url": api_url,
            "instance_name": getattr(settings, "INSTANCE_NAME", "TeleSec"),
        },
    )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


def logout_view(request):
    request.session.flush()
    return redirect("/")
