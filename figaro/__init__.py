# app/__init__.py
from flask import Flask, request, url_for
from werkzeug.routing import BuildError
from figaro.extensions import db, migrate, upgrade
from figaro.index.routes import index_bp
from figaro.comedor.routes import comedor_bp
from pathlib import Path
import sys
import locale

# Configurar el idioma a español
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')

if getattr(sys, 'frozen', False):
    # Ejecutándose como .exe de PyInstaller
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    # Ejecutándose normalmente con Python
    BASE_DIR = Path(__file__).resolve().parent.parent

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{BASE_DIR / 'datos.db'}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['WTF_CSRF_SECRET_KEY'] = 'pneumonoultramicroscopicsilicovolcanoconiosis'
    app.config['SECRET_KEY'] = 'pneumonoultramicroscopicsilicovolcanoconiosis'

    # Inicializar las extensiones
    db.init_app(app)
    migrate.init_app(app, db) # <--- Inicialización de Flask-Migrate

    with app.app_context():
        upgrade()

    @app.context_processor
    def inject_breadcrumbs():
        breadcrumbs = []
        endpoint = request.endpoint
        view_args = request.view_args or {}
        visited = set()

        # Follow the endpoint metadata from the current view to its root.
        while endpoint and endpoint not in visited:
            visited.add(endpoint)
            view_func = app.view_functions.get(endpoint)
            if view_func is None or not hasattr(view_func, '_breadcrumb_title'):
                break

            title = view_func._breadcrumb_title
            if callable(title):
                title = title()

            try:
                # A parent route may accept fewer parameters than the current
                # route. Only pass the values declared by that parent rule.
                rule = next(
                    rule for rule in app.url_map.iter_rules(endpoint)
                    if rule.endpoint == endpoint
                )
                args = {
                    name: view_args[name]
                    for name in rule.arguments
                    if name in view_args
                }
                url = url_for(endpoint, **args)
            except (BuildError, StopIteration):
                url = '#'

            breadcrumbs.insert(0, {'title': title, 'url': url})

            endpoint = getattr(view_func, '_breadcrumb_parent', None)

        return dict(breadcrumbs=breadcrumbs)

    # Registrar los Blueprints
    app.register_blueprint(index_bp)
    app.register_blueprint(comedor_bp, url_prefix='/comedor')

    return app
