"""Module CRUD views – SSR, session-authenticated."""
import base64
import json
import uuid
from datetime import datetime, timezone
from functools import wraps

from django.contrib import messages
from django.shortcuts import redirect, render

from ..models import Document, InstalledModule
from ..utils import iso_now


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return iso_now()


def _get_enabled_modules() -> list:
    modules: list[str] = []
    for im in InstalledModule.objects.select_related("package").filter(enabled=True):
        modules.extend(im.package.modules)
    return list(dict.fromkeys(modules))


def _get_personas_list() -> list:
    """Return all non-deleted, non-hidden personas for FK dropdowns."""
    personas = []
    for doc in Document.objects.filter(table_name="personas", deleted=False):
        try:
            data = json.loads(doc.data)
            item_id = doc.id.split(":", 1)[1] if ":" in doc.id else doc.id
            personas.append({"id": item_id, "Nombre": data.get("Nombre", item_id)})
        except Exception:
            pass
    return personas


def _personas_map() -> dict:
    """Map persona doc_id → Nombre for display in list views."""
    result = {}
    for doc in Document.objects.filter(table_name="personas", deleted=False):
        try:
            data = json.loads(doc.data)
            item_id = doc.id.split(":", 1)[1] if ":" in doc.id else doc.id
            result[item_id] = data.get("Nombre", item_id)
        except Exception:
            pass
    return result


def app_context(request) -> dict:
    """Build the common template context for every SSR module page."""
    from django.conf import settings
    persona_id = request.session.get("persona_id", "")
    roles = request.session.get("roles", [])
    enabled_modules = _get_enabled_modules()
    return {
        "persona_id": persona_id,
        "roles": roles,
        "enabled_modules": enabled_modules,
        "nav_modules": enabled_modules,
        "instance_name": getattr(settings, "INSTANCE_NAME", "TeleSec"),
        "is_admin": "ADMIN" in roles,
    }


# ---------------------------------------------------------------------------
# Auth decorator
# ---------------------------------------------------------------------------

def login_required_session(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get("access_token"):
            return redirect("/")
        return view_func(request, *args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def _list_docs(table_name: str) -> list:
    rows = []
    for doc in Document.objects.filter(table_name=table_name, deleted=False).order_by("-updated_at"):
        try:
            data = json.loads(doc.data)
            item_id = doc.id.split(":", 1)[1] if ":" in doc.id else doc.id
            rows.append({"id": item_id, **data})
        except Exception:
            pass
    return rows


def _get_doc(table_name: str, doc_id: str):
    """Return parsed doc dict or None if not found."""
    try:
        doc = Document.objects.get(id=f"{table_name}:{doc_id}", deleted=False)
        data = json.loads(doc.data)
        return {"id": doc_id, **data}
    except (Document.DoesNotExist, Exception):
        return None


def _save_doc(table_name: str, doc_id: str, data: dict):
    now = _now_iso()
    doc, _ = Document.objects.update_or_create(
        id=f"{table_name}:{doc_id}",
        defaults={
            "table_name": table_name,
            "data": json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            "updated_at": now,
            "deleted": False,
        },
    )
    return doc


def _soft_delete(table_name: str, doc_id: str):
    Document.objects.filter(id=f"{table_name}:{doc_id}").update(
        deleted=True,
        updated_at=_now_iso(),
    )


# ===========================================================================
# MATERIALES
# ===========================================================================

@login_required_session
def materiales_list(request):
    ctx = app_context(request)
    items = _list_docs("materiales")
    ctx["items"] = items
    return render(request, "core/modules/materiales_list.html", ctx)


@login_required_session
def materiales_create(request):
    ctx = app_context(request)
    if request.method == "POST":
        try:
            movimientos_raw = request.POST.get("Movimientos", "[]")
            try:
                movimientos = json.loads(movimientos_raw)
            except Exception:
                movimientos = []
            data = {
                "Nombre": request.POST.get("Nombre", ""),
                "Unidad": request.POST.get("Unidad", ""),
                "Cantidad": _parse_number(request.POST.get("Cantidad", "0")),
                "Cantidad_Minima": _parse_number(request.POST.get("Cantidad_Minima", "0")),
                "Ubicacion": request.POST.get("Ubicacion", ""),
                "Revision": request.POST.get("Revision", ""),
                "Notas": request.POST.get("Notas", ""),
                "Movimientos": movimientos,
            }
            doc_id = str(uuid.uuid4())
            _save_doc("materiales", doc_id, data)
            messages.success(request, "Material creado correctamente.")
            return redirect("/app/materiales/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {}
    ctx["is_new"] = True
    return render(request, "core/modules/materiales_edit.html", ctx)


@login_required_session
def materiales_edit(request, doc_id):
    ctx = app_context(request)
    item = _get_doc("materiales", doc_id)
    if item is None:
        messages.error(request, "Material no encontrado.")
        return redirect("/app/materiales/")
    if request.method == "POST":
        try:
            movimientos_raw = request.POST.get("Movimientos", "[]")
            try:
                movimientos = json.loads(movimientos_raw)
            except Exception:
                movimientos = item.get("Movimientos", [])
            data = {
                "Nombre": request.POST.get("Nombre", ""),
                "Unidad": request.POST.get("Unidad", ""),
                "Cantidad": _parse_number(request.POST.get("Cantidad", "0")),
                "Cantidad_Minima": _parse_number(request.POST.get("Cantidad_Minima", "0")),
                "Ubicacion": request.POST.get("Ubicacion", ""),
                "Revision": request.POST.get("Revision", ""),
                "Notas": request.POST.get("Notas", ""),
                "Movimientos": movimientos,
            }
            _save_doc("materiales", doc_id, data)
            messages.success(request, "Material actualizado.")
            return redirect("/app/materiales/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["is_new"] = False
    return render(request, "core/modules/materiales_edit.html", ctx)


@login_required_session
def materiales_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("materiales", doc_id)
        messages.success(request, "Material eliminado.")
    return redirect("/app/materiales/")


# ===========================================================================
# PERSONAS
# ===========================================================================

@login_required_session
def personas_list(request):
    ctx = app_context(request)
    items = _list_docs("personas")
    ctx["items"] = items
    return render(request, "core/modules/personas_list.html", ctx)


@login_required_session
def personas_create(request):
    ctx = app_context(request)
    if request.method == "POST":
        try:
            foto = _handle_foto(request, None)
            data = {
                "Nombre": request.POST.get("Nombre", ""),
                "Region": request.POST.get("Region", ""),
                "Roles": request.POST.get("Roles", ""),
                "Foto": foto,
                "Notas": request.POST.get("Notas", ""),
                "Monedero_Balance": _parse_number(request.POST.get("Monedero_Balance", "0")),
                "Oculto": request.POST.get("Oculto") == "on",
                "email": request.POST.get("email", ""),
            }
            doc_id = str(uuid.uuid4())
            _save_doc("personas", doc_id, data)
            messages.success(request, "Persona creada correctamente.")
            return redirect("/app/personas/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {}
    ctx["is_new"] = True
    return render(request, "core/modules/personas_edit.html", ctx)


@login_required_session
def personas_edit(request, doc_id):
    ctx = app_context(request)
    item = _get_doc("personas", doc_id)
    if item is None:
        messages.error(request, "Persona no encontrada.")
        return redirect("/app/personas/")
    if request.method == "POST":
        try:
            foto = _handle_foto(request, item.get("Foto", ""))
            data = {
                "Nombre": request.POST.get("Nombre", ""),
                "Region": request.POST.get("Region", ""),
                "Roles": request.POST.get("Roles", ""),
                "Foto": foto,
                "Notas": request.POST.get("Notas", ""),
                "Monedero_Balance": _parse_number(request.POST.get("Monedero_Balance", "0")),
                "Oculto": request.POST.get("Oculto") == "on",
                "email": request.POST.get("email", ""),
            }
            _save_doc("personas", doc_id, data)
            messages.success(request, "Persona actualizada.")
            return redirect("/app/personas/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["is_new"] = False
    return render(request, "core/modules/personas_edit.html", ctx)


@login_required_session
def personas_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("personas", doc_id)
        messages.success(request, "Persona eliminada.")
    return redirect("/app/personas/")


def _handle_foto(request, existing_foto) -> str:
    """Return base64 data-URI for foto. Keeps existing if no new file uploaded."""
    file = request.FILES.get("Foto_file")
    if file:
        content = file.read()
        mime = file.content_type or "image/jpeg"
        encoded = base64.b64encode(content).decode("ascii")
        return f"data:{mime};base64,{encoded}"
    return existing_foto or ""


# ===========================================================================
# SUPERCAFE
# ===========================================================================

@login_required_session
def supercafe_list(request):
    ctx = app_context(request)
    items = _list_docs("supercafe")
    pmap = _personas_map()
    for item in items:
        item["_persona_nombre"] = pmap.get(item.get("Persona", ""), item.get("Persona", ""))
        comanda = item.get("Comanda", [])
        if isinstance(comanda, list):
            item["_total"] = sum(
                float(c.get("Precio", 0)) * int(c.get("Cantidad", 1))
                for c in comanda
                if isinstance(c, dict)
            )
        else:
            item["_total"] = 0
    ctx["items"] = items
    return render(request, "core/modules/supercafe_list.html", ctx)


@login_required_session
def supercafe_create(request):
    ctx = app_context(request)
    ctx["personas"] = _get_personas_list()
    if request.method == "POST":
        try:
            comanda_raw = request.POST.get("Comanda", "[]")
            try:
                comanda = json.loads(comanda_raw)
            except Exception:
                comanda = []
            data = {
                "Persona": request.POST.get("Persona", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Comanda": comanda,
                "Estado": request.POST.get("Estado", "Pendiente"),
                "Notas": request.POST.get("Notas", ""),
            }
            doc_id = str(uuid.uuid4())
            _save_doc("supercafe", doc_id, data)
            messages.success(request, "Comanda creada correctamente.")
            return redirect("/app/supercafe/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {}
    ctx["is_new"] = True
    return render(request, "core/modules/supercafe_edit.html", ctx)


@login_required_session
def supercafe_edit(request, doc_id):
    ctx = app_context(request)
    ctx["personas"] = _get_personas_list()
    item = _get_doc("supercafe", doc_id)
    if item is None:
        messages.error(request, "Comanda no encontrada.")
        return redirect("/app/supercafe/")
    if request.method == "POST":
        try:
            comanda_raw = request.POST.get("Comanda", "[]")
            try:
                comanda = json.loads(comanda_raw)
            except Exception:
                comanda = item.get("Comanda", [])
            data = {
                "Persona": request.POST.get("Persona", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Comanda": comanda,
                "Estado": request.POST.get("Estado", "Pendiente"),
                "Notas": request.POST.get("Notas", ""),
            }
            _save_doc("supercafe", doc_id, data)
            messages.success(request, "Comanda actualizada.")
            return redirect("/app/supercafe/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["item"]["_comanda_json"] = json.dumps(item.get("Comanda", []), ensure_ascii=False)
    ctx["is_new"] = False
    return render(request, "core/modules/supercafe_edit.html", ctx)


@login_required_session
def supercafe_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("supercafe", doc_id)
        messages.success(request, "Comanda eliminada.")
    return redirect("/app/supercafe/")


# ===========================================================================
# COMEDOR
# ===========================================================================

@login_required_session
def comedor_list(request):
    ctx = app_context(request)
    items = _list_docs("comedor")
    for item in items:
        platos = item.get("Platos", [])
        item["_num_platos"] = len(platos) if isinstance(platos, list) else 0
    ctx["items"] = items
    return render(request, "core/modules/comedor_list.html", ctx)


@login_required_session
def comedor_create(request):
    ctx = app_context(request)
    if request.method == "POST":
        try:
            platos_raw = request.POST.get("Platos", "[]")
            try:
                platos = json.loads(platos_raw)
            except Exception:
                platos = []
            data = {
                "Fecha": request.POST.get("Fecha", ""),
                "Platos": platos,
                "Notas": request.POST.get("Notas", ""),
            }
            doc_id = str(uuid.uuid4())
            _save_doc("comedor", doc_id, data)
            messages.success(request, "Menú creado correctamente.")
            return redirect("/app/comedor/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {}
    ctx["is_new"] = True
    return render(request, "core/modules/comedor_edit.html", ctx)


@login_required_session
def comedor_edit(request, doc_id):
    ctx = app_context(request)
    item = _get_doc("comedor", doc_id)
    if item is None:
        messages.error(request, "Menú no encontrado.")
        return redirect("/app/comedor/")
    if request.method == "POST":
        try:
            platos_raw = request.POST.get("Platos", "[]")
            try:
                platos = json.loads(platos_raw)
            except Exception:
                platos = item.get("Platos", [])
            data = {
                "Fecha": request.POST.get("Fecha", ""),
                "Platos": platos,
                "Notas": request.POST.get("Notas", ""),
            }
            _save_doc("comedor", doc_id, data)
            messages.success(request, "Menú actualizado.")
            return redirect("/app/comedor/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["item"]["_platos_json"] = json.dumps(item.get("Platos", []), ensure_ascii=False)
    ctx["is_new"] = False
    return render(request, "core/modules/comedor_edit.html", ctx)


@login_required_session
def comedor_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("comedor", doc_id)
        messages.success(request, "Menú eliminado.")
    return redirect("/app/comedor/")


# ===========================================================================
# PAGOS
# ===========================================================================

@login_required_session
def pagos_list(request):
    ctx = app_context(request)
    items = _list_docs("pagos")
    pmap = _personas_map()
    for item in items:
        item["_persona_nombre"] = pmap.get(item.get("Persona", ""), item.get("Persona", ""))
    ctx["items"] = items
    return render(request, "core/modules/pagos_list.html", ctx)


@login_required_session
def pagos_create(request):
    ctx = app_context(request)
    ctx["personas"] = _get_personas_list()
    if request.method == "POST":
        try:
            data = {
                "Persona": request.POST.get("Persona", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Concepto": request.POST.get("Concepto", ""),
                "Importe": _parse_number(request.POST.get("Importe", "0")),
                "Tipo": request.POST.get("Tipo", "Cargo"),
                "Notas": request.POST.get("Notas", ""),
            }
            doc_id = str(uuid.uuid4())
            _save_doc("pagos", doc_id, data)
            messages.success(request, "Pago registrado correctamente.")
            return redirect("/app/pagos/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {}
    ctx["is_new"] = True
    return render(request, "core/modules/pagos_edit.html", ctx)


@login_required_session
def pagos_edit(request, doc_id):
    ctx = app_context(request)
    ctx["personas"] = _get_personas_list()
    item = _get_doc("pagos", doc_id)
    if item is None:
        messages.error(request, "Pago no encontrado.")
        return redirect("/app/pagos/")
    if request.method == "POST":
        try:
            data = {
                "Persona": request.POST.get("Persona", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Concepto": request.POST.get("Concepto", ""),
                "Importe": _parse_number(request.POST.get("Importe", "0")),
                "Tipo": request.POST.get("Tipo", "Cargo"),
                "Notas": request.POST.get("Notas", ""),
            }
            _save_doc("pagos", doc_id, data)
            messages.success(request, "Pago actualizado.")
            return redirect("/app/pagos/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["is_new"] = False
    return render(request, "core/modules/pagos_edit.html", ctx)


@login_required_session
def pagos_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("pagos", doc_id)
        messages.success(request, "Pago eliminado.")
    return redirect("/app/pagos/")


# ===========================================================================
# NOTAS
# ===========================================================================

@login_required_session
def notas_list(request):
    ctx = app_context(request)
    items = _list_docs("notas")
    ctx["items"] = items
    return render(request, "core/modules/notas_list.html", ctx)


@login_required_session
def notas_create(request):
    ctx = app_context(request)
    if request.method == "POST":
        try:
            data = {
                "Asunto": request.POST.get("Asunto", ""),
                "Contenido": request.POST.get("Contenido", ""),
                "Autor": request.POST.get("Autor", request.session.get("persona_id", "")),
                "Fecha": request.POST.get("Fecha", _now_iso()[:10]),
            }
            doc_id = str(uuid.uuid4())
            _save_doc("notas", doc_id, data)
            messages.success(request, "Nota creada correctamente.")
            return redirect("/app/notas/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {"Fecha": _now_iso()[:10]}
    ctx["is_new"] = True
    return render(request, "core/modules/notas_edit.html", ctx)


@login_required_session
def notas_edit(request, doc_id):
    ctx = app_context(request)
    item = _get_doc("notas", doc_id)
    if item is None:
        messages.error(request, "Nota no encontrada.")
        return redirect("/app/notas/")
    if request.method == "POST":
        try:
            data = {
                "Asunto": request.POST.get("Asunto", ""),
                "Contenido": request.POST.get("Contenido", ""),
                "Autor": request.POST.get("Autor", ""),
                "Fecha": request.POST.get("Fecha", ""),
            }
            _save_doc("notas", doc_id, data)
            messages.success(request, "Nota actualizada.")
            return redirect("/app/notas/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["is_new"] = False
    return render(request, "core/modules/notas_edit.html", ctx)


@login_required_session
def notas_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("notas", doc_id)
        messages.success(request, "Nota eliminada.")
    return redirect("/app/notas/")


# ===========================================================================
# ASISTENCIA
# ===========================================================================

@login_required_session
def asistencia_list(request):
    ctx = app_context(request)
    items = _list_docs("asistencia")
    pmap = _personas_map()
    for item in items:
        item["_persona_nombre"] = pmap.get(item.get("Persona", ""), item.get("Persona", ""))
    ctx["items"] = items
    return render(request, "core/modules/asistencia_list.html", ctx)


@login_required_session
def asistencia_create(request):
    ctx = app_context(request)
    ctx["personas"] = _get_personas_list()
    if request.method == "POST":
        try:
            data = {
                "Persona": request.POST.get("Persona", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Estado": request.POST.get("Estado", "Presente"),
                "Notas": request.POST.get("Notas", ""),
            }
            doc_id = str(uuid.uuid4())
            _save_doc("asistencia", doc_id, data)
            messages.success(request, "Asistencia registrada.")
            return redirect("/app/asistencia/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {"Fecha": _now_iso()[:10]}
    ctx["is_new"] = True
    return render(request, "core/modules/asistencia_edit.html", ctx)


@login_required_session
def asistencia_edit(request, doc_id):
    ctx = app_context(request)
    ctx["personas"] = _get_personas_list()
    item = _get_doc("asistencia", doc_id)
    if item is None:
        messages.error(request, "Registro no encontrado.")
        return redirect("/app/asistencia/")
    if request.method == "POST":
        try:
            data = {
                "Persona": request.POST.get("Persona", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Estado": request.POST.get("Estado", "Presente"),
                "Notas": request.POST.get("Notas", ""),
            }
            _save_doc("asistencia", doc_id, data)
            messages.success(request, "Asistencia actualizada.")
            return redirect("/app/asistencia/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["is_new"] = False
    return render(request, "core/modules/asistencia_edit.html", ctx)


@login_required_session
def asistencia_delete(request, doc_id):
    if request.method == "POST":
        _soft_delete("asistencia", doc_id)
        messages.success(request, "Registro eliminado.")
    return redirect("/app/asistencia/")


# ===========================================================================
# AULAS  (two sub-tables: aulas_solicitudes + aulas_informes)
# ===========================================================================

@login_required_session
def aulas_list(request):
    ctx = app_context(request)
    solicitudes = _list_docs("aulas_solicitudes")
    informes = _list_docs("aulas_informes")
    ctx["solicitudes"] = solicitudes
    ctx["informes"] = informes
    return render(request, "core/modules/aulas_list.html", ctx)


@login_required_session
def aulas_create(request):
    ctx = app_context(request)
    subtable = request.GET.get("tipo", "aulas_solicitudes")
    if subtable not in ("aulas_solicitudes", "aulas_informes"):
        subtable = "aulas_solicitudes"
    if request.method == "POST":
        subtable = request.POST.get("subtable", subtable)
        if subtable not in ("aulas_solicitudes", "aulas_informes"):
            subtable = "aulas_solicitudes"
        try:
            data = {
                "Asunto": request.POST.get("Asunto", ""),
                "Contenido": request.POST.get("Contenido", ""),
                "Fecha": request.POST.get("Fecha", _now_iso()[:10]),
                "Estado": request.POST.get("Estado", "Pendiente"),
            }
            if subtable == "aulas_solicitudes":
                data["Solicitante"] = request.POST.get("Solicitante", "")
            else:
                data["Autor"] = request.POST.get("Autor", "")
            doc_id = str(uuid.uuid4())
            _save_doc(subtable, doc_id, data)
            messages.success(request, "Registro creado correctamente.")
            return redirect("/app/aulas/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = {"Fecha": _now_iso()[:10]}
    ctx["subtable"] = subtable
    ctx["is_new"] = True
    return render(request, "core/modules/aulas_edit.html", ctx)


@login_required_session
def aulas_edit(request, subtable, doc_id):
    ctx = app_context(request)
    if subtable not in ("aulas_solicitudes", "aulas_informes"):
        return redirect("/app/aulas/")
    item = _get_doc(subtable, doc_id)
    if item is None:
        messages.error(request, "Registro no encontrado.")
        return redirect("/app/aulas/")
    if request.method == "POST":
        try:
            data = {
                "Asunto": request.POST.get("Asunto", ""),
                "Contenido": request.POST.get("Contenido", ""),
                "Fecha": request.POST.get("Fecha", ""),
                "Estado": request.POST.get("Estado", "Pendiente"),
            }
            if subtable == "aulas_solicitudes":
                data["Solicitante"] = request.POST.get("Solicitante", "")
            else:
                data["Autor"] = request.POST.get("Autor", "")
            _save_doc(subtable, doc_id, data)
            messages.success(request, "Registro actualizado.")
            return redirect("/app/aulas/")
        except Exception as exc:
            messages.error(request, f"Error al guardar: {exc}")
    ctx["item"] = item
    ctx["subtable"] = subtable
    ctx["is_new"] = False
    return render(request, "core/modules/aulas_edit.html", ctx)


@login_required_session
def aulas_delete(request, subtable, doc_id):
    if request.method == "POST":
        if subtable in ("aulas_solicitudes", "aulas_informes"):
            _soft_delete(subtable, doc_id)
            messages.success(request, "Registro eliminado.")
    return redirect("/app/aulas/")


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _parse_number(value: str):
    """Parse a numeric string, returning int if whole number else float."""
    try:
        f = float(str(value).replace(",", "."))
        return int(f) if f == int(f) else f
    except (ValueError, TypeError):
        return 0
