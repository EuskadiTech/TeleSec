"""Server-side rendered views – login flow and home dashboard."""
from django.conf import settings
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie

from ..auth_helpers import get_persona_roles, get_personas, verify_instance_password
from ..jwt_utils import create_access_token, create_refresh_token
from ..models import Document


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
# Home dashboard (replaces old app_view)
# ---------------------------------------------------------------------------


def home_view(request):
    from .module_views import app_context
    access_token = request.session.get("access_token")
    if not access_token:
        return redirect("/")
    ctx = app_context(request)
    return render(request, "core/home.html", ctx)


# Keep old app_view as alias for backward compatibility
app_view = home_view


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


def logout_view(request):
    request.session.flush()
    return redirect("/")
