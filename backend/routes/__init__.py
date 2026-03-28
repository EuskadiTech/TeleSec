from .auth_routes import bp as auth_bp
from .replicate_routes import bp as replicate_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(replicate_bp)
