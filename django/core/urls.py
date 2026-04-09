from django.urls import path

from .views.auth_views import BootstrapAdminView, LoginView, RefreshView, SelectPersonaView
from .views.frontend_views import app_view, login_view, logout_view
from .views.replicate_views import PullView, PushView
from .views.store_views import (
    CatalogView,
    InstallView,
    InstalledView,
    ToggleView,
    UninstallView,
)

urlpatterns = [
    # ------------------------------------------------------------------
    # SSR pages
    # ------------------------------------------------------------------
    path("", login_view, name="login"),
    path("app/", app_view, name="app"),
    path("logout/", logout_view, name="logout"),

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
