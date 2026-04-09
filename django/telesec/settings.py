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
# Application
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
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
            ],
        },
    },
]

WSGI_APPLICATION = "telesec.wsgi.application"

# ---------------------------------------------------------------------------
# Database – same SQLite path convention as Flask backend
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
# Sessions – stored in the database so no extra file I/O is needed
# ---------------------------------------------------------------------------
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG

# ---------------------------------------------------------------------------
# Static files – WhiteNoise root serves the built dist/ at /
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = []

# Serve everything in dist/ at root (/, /static/, /load.gif, etc.)
WHITENOISE_ROOT = BASE_DIR.parent / "dist"
WHITENOISE_MAX_AGE = 86400

# ---------------------------------------------------------------------------
# REST Framework – JWT-only, no session auth for the API
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
# ---------------------------------------------------------------------------
KEYGEN_ACCOUNT_ID = os.environ.get("KEYGEN_ACCOUNT_ID", "")
KEYGEN_API_URL = "https://api.keygen.sh/v1"

# ---------------------------------------------------------------------------
# Module catalog
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
