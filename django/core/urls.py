from django.urls import path

from .views.auth_views import BootstrapAdminView, LoginView, RefreshView, SelectPersonaView
from .views.frontend_views import app_view, home_view, login_view, logout_view
from .views.module_views import (
    asistencia_create,
    asistencia_delete,
    asistencia_edit,
    asistencia_list,
    aulas_create,
    aulas_delete,
    aulas_edit,
    aulas_list,
    comedor_create,
    comedor_delete,
    comedor_edit,
    comedor_list,
    materiales_create,
    materiales_delete,
    materiales_edit,
    materiales_list,
    notas_create,
    notas_delete,
    notas_edit,
    notas_list,
    pagos_create,
    pagos_delete,
    pagos_edit,
    pagos_list,
    personas_create,
    personas_delete,
    personas_edit,
    personas_list,
    supercafe_create,
    supercafe_delete,
    supercafe_edit,
    supercafe_list,
)
from .views.replicate_views import PullView, PushView
from .views.store_views import (
    CatalogView,
    InstallView,
    InstalledView,
    ToggleView,
    UninstallView,
)
from .views.tienda_views import tienda_view

urlpatterns = [
    # ------------------------------------------------------------------
    # SSR pages
    # ------------------------------------------------------------------
    path("", login_view, name="login"),
    path("app/", home_view, name="home"),
    path("logout/", logout_view, name="logout"),

    # ------------------------------------------------------------------
    # Module pages – materiales
    # ------------------------------------------------------------------
    path("app/materiales/", materiales_list, name="materiales-list"),
    path("app/materiales/nuevo/", materiales_create, name="materiales-create"),
    path("app/materiales/<str:doc_id>/", materiales_edit, name="materiales-edit"),
    path("app/materiales/<str:doc_id>/borrar/", materiales_delete, name="materiales-delete"),

    # personas
    path("app/personas/", personas_list, name="personas-list"),
    path("app/personas/nuevo/", personas_create, name="personas-create"),
    path("app/personas/<str:doc_id>/", personas_edit, name="personas-edit"),
    path("app/personas/<str:doc_id>/borrar/", personas_delete, name="personas-delete"),

    # supercafe
    path("app/supercafe/", supercafe_list, name="supercafe-list"),
    path("app/supercafe/nuevo/", supercafe_create, name="supercafe-create"),
    path("app/supercafe/<str:doc_id>/", supercafe_edit, name="supercafe-edit"),
    path("app/supercafe/<str:doc_id>/borrar/", supercafe_delete, name="supercafe-delete"),

    # comedor
    path("app/comedor/", comedor_list, name="comedor-list"),
    path("app/comedor/nuevo/", comedor_create, name="comedor-create"),
    path("app/comedor/<str:doc_id>/", comedor_edit, name="comedor-edit"),
    path("app/comedor/<str:doc_id>/borrar/", comedor_delete, name="comedor-delete"),

    # pagos
    path("app/pagos/", pagos_list, name="pagos-list"),
    path("app/pagos/nuevo/", pagos_create, name="pagos-create"),
    path("app/pagos/<str:doc_id>/", pagos_edit, name="pagos-edit"),
    path("app/pagos/<str:doc_id>/borrar/", pagos_delete, name="pagos-delete"),

    # notas
    path("app/notas/", notas_list, name="notas-list"),
    path("app/notas/nuevo/", notas_create, name="notas-create"),
    path("app/notas/<str:doc_id>/", notas_edit, name="notas-edit"),
    path("app/notas/<str:doc_id>/borrar/", notas_delete, name="notas-delete"),

    # asistencia
    path("app/asistencia/", asistencia_list, name="asistencia-list"),
    path("app/asistencia/nuevo/", asistencia_create, name="asistencia-create"),
    path("app/asistencia/<str:doc_id>/", asistencia_edit, name="asistencia-edit"),
    path("app/asistencia/<str:doc_id>/borrar/", asistencia_delete, name="asistencia-delete"),

    # aulas (sub-tables: aulas_solicitudes / aulas_informes)
    path("app/aulas/", aulas_list, name="aulas-list"),
    path("app/aulas/nuevo/", aulas_create, name="aulas-create"),
    path("app/aulas/<str:subtable>/<str:doc_id>/", aulas_edit, name="aulas-edit"),
    path("app/aulas/<str:subtable>/<str:doc_id>/borrar/", aulas_delete, name="aulas-delete"),

    # tienda
    path("app/tienda/", tienda_view, name="tienda"),

    # ------------------------------------------------------------------
    # Auth API
    # ------------------------------------------------------------------
    path("api/auth/login", LoginView.as_view(), name="api-login"),
    path("api/auth/select-persona", SelectPersonaView.as_view(), name="api-select-persona"),
    path("api/auth/refresh", RefreshView.as_view(), name="api-refresh"),
    path("api/auth/bootstrap-admin", BootstrapAdminView.as_view(), name="api-bootstrap"),

    # ------------------------------------------------------------------
    # RxDB replication API
    # ------------------------------------------------------------------
    path("api/replicate/pull", PullView.as_view(), name="api-pull"),
    path("api/replicate/push", PushView.as_view(), name="api-push"),

    # ------------------------------------------------------------------
    # Module store API
    # ------------------------------------------------------------------
    path("api/store/catalog", CatalogView.as_view(), name="api-store-catalog"),
    path("api/store/installed", InstalledView.as_view(), name="api-store-installed"),
    path("api/store/install", InstallView.as_view(), name="api-store-install"),
    path("api/store/uninstall", UninstallView.as_view(), name="api-store-uninstall"),
    path("api/store/toggle", ToggleView.as_view(), name="api-store-toggle"),
]
