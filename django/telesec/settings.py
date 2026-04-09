import os
import warnings
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
_DEV_SECRET = "django-insecure-change-this-in-production"
_DEV_JWT_SECRET = "jwt-secret-key-CHANGE-IN-PRODUCTION"

SECRET_KEY = os.environ.get("SECRET_KEY", _DEV_SECRET)
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", _DEV_JWT_SECRET)
JWT_ACCESS_TOKEN_LIFETIME = timedelta(hours=24)
JWT_REFRESH_TOKEN_LIFETIME = timedelta(days=30)

DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"

_allowed = os.environ.get("ALLOWED_HOSTS", "")
ALLOWED_HOSTS = _allowed.split(",") if _allowed.strip() else ["*"]

# ---------------------------------------------------------------------------
# Instance config – no multi-tenancy; each deployment is a single instance.
# INSTANCE_PASSWORD is the shared login password for persona selection.
# INSTANCE_NAME is displayed in the UI.
# ---------------------------------------------------------------------------
INSTANCE_PASSWORD = os.environ.get("INSTANCE_PASSWORD", "")
INSTANCE_NAME = os.environ.get("INSTANCE_NAME", "TeleSec")

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "django.contrib.messages",
    "rest_framework",
    "corsheaders",
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "telesec.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "telesec.wsgi.application"

# ---------------------------------------------------------------------------
# Database – SQLite; path configurable via DATABASE_PATH env var
# ---------------------------------------------------------------------------
DATABASE_PATH = os.environ.get("DATABASE_PATH", str(BASE_DIR.parent / "telesec.db"))

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DATABASE_PATH,
        "OPTIONS": {
            "timeout": 20,
            "init_command": (
                "PRAGMA journal_mode=WAL;"
                "PRAGMA cache_size=-32768;"
                "PRAGMA foreign_keys=ON;"
                "PRAGMA synchronous=NORMAL;"
            ),
        },
    }
}

# ---------------------------------------------------------------------------
# Sessions – stored in the database
# ---------------------------------------------------------------------------
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG

# ---------------------------------------------------------------------------
# Static files – WhiteNoise root serves the built dist/ tree at /
# ---------------------------------------------------------------------------
STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = []

# dist/ is served verbatim at / (so /static/adminlte/... works as expected)
WHITENOISE_ROOT = BASE_DIR.parent / "dist"
WHITENOISE_MAX_AGE = 86400

# ---------------------------------------------------------------------------
# REST Framework – custom JWT auth, no Django User model required
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_cors_origins = os.environ.get("CORS_ORIGINS", "*")
if _cors_origins == "*":
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()]

CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Licensing – Keygen.sh
# KEYGEN_ACCOUNT_ID: your Keygen.sh account UUID (public)
# ---------------------------------------------------------------------------
KEYGEN_ACCOUNT_ID = os.environ.get("KEYGEN_ACCOUNT_ID", "")
KEYGEN_API_URL = "https://api.keygen.sh/v1"

# ---------------------------------------------------------------------------
# Module catalog path
# ---------------------------------------------------------------------------
CATALOG_PATH = BASE_DIR.parent / "catalog" / "packages.json"

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Messages – use session storage (no django.contrib.auth required)
MESSAGE_STORAGE = "django.contrib.messages.storage.session.SessionStorage"

# ---------------------------------------------------------------------------
# Production warnings
# ---------------------------------------------------------------------------
if not DEBUG:
    if SECRET_KEY == _DEV_SECRET:
        warnings.warn(
            "SECRET_KEY is the default development value. Set SECRET_KEY before deploying.",
            stacklevel=1,
        )
    if JWT_SECRET_KEY == _DEV_JWT_SECRET:
        warnings.warn(
            "JWT_SECRET_KEY is the default development value. Set JWT_SECRET_KEY before deploying.",
            stacklevel=1,
        )
    if not INSTANCE_PASSWORD:
        warnings.warn(
            "INSTANCE_PASSWORD is not set. The instance will be accessible without a password.",
            stacklevel=1,
        )
