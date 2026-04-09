"""SSR module store (tienda) view."""
import json

from django.contrib import messages
from django.shortcuts import redirect, render

from ..models import InstalledModule, ModulePackage
from .module_views import app_context, login_required_session


@login_required_session
def tienda_view(request):
    ctx = app_context(request)

    packages = list(ModulePackage.objects.all().order_by("name"))
    installed_map = {
        im.package.package_id: im
        for im in InstalledModule.objects.select_related("package")
    }

    catalog = []
    for pkg in packages:
        inst = installed_map.get(pkg.package_id)
        catalog.append({
            "package_id": pkg.package_id,
            "name": pkg.name,
            "description": pkg.description,
            "version": pkg.version,
            "modules": pkg.modules,
            "bundled": pkg.bundled,
            "free": pkg.free,
            "icon": pkg.icon or "fas fa-box",
            "installed": inst is not None,
            "enabled": inst.enabled if inst else False,
        })

    ctx["catalog"] = catalog
    return render(request, "core/modules/tienda.html", ctx)
