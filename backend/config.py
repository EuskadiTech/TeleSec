import os
import warnings
from datetime import timedelta

_DEV_SECRET = "dev-secret-key-CHANGE-IN-PRODUCTION"
_DEV_JWT_SECRET = "jwt-secret-key-CHANGE-IN-PRODUCTION"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", _DEV_SECRET)
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", _DEV_JWT_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    DATABASE_PATH = os.environ.get("DATABASE_PATH", "telesec.db")
    # Comma-separated list of allowed origins; '*' allows all
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    PORT = int(os.environ.get("PORT", 5000))

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

    @classmethod
    def warn_if_insecure(cls):
        """Emit warnings when running with default development secrets."""
        if not cls.FLASK_DEBUG:
            if cls.SECRET_KEY == _DEV_SECRET:
                warnings.warn(
                    "SECRET_KEY is set to the default development value. "
                    "Set SECRET_KEY environment variable before deploying to production.",
                    stacklevel=2,
                )
            if cls.JWT_SECRET_KEY == _DEV_JWT_SECRET:
                warnings.warn(
                    "JWT_SECRET_KEY is set to the default development value. "
                    "Set JWT_SECRET_KEY environment variable before deploying to production.",
                    stacklevel=2,
                )
