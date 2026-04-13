import os

from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import jwt
from .models import init_db
from .routes import register_routes
from .socketio_server import socketio


def create_app(config: dict = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)

    Config.warn_if_insecure()

    origins = app.config.get("CORS_ORIGINS", "*")
    CORS(app, origins=origins, supports_credentials=True)

    jwt.init_app(app)
    init_db()
    register_routes(app)
    
    # Initialize SocketIO for real-time data access
    socketio.init_app(app, cors_allowed_origins=origins)

    return app
