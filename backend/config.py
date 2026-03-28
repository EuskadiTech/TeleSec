import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-CHANGE-IN-PRODUCTION")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-CHANGE-IN-PRODUCTION")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    DATABASE_PATH = os.environ.get("DATABASE_PATH", "telesec.db")
    # Comma-separated list of allowed origins; '*' allows all
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    PORT = int(os.environ.get("PORT", 5000))
