# app/__init__.py
from flask import Flask
from figaro.extensions import db, migrate
from figaro.comedor.routes import comedor_bp
from figaro.comedor.models import Menu

def create_app():
    app = Flask(__name__)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mi_base_de_datos.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Inicializar las extensiones
    db.init_app(app)
    migrate.init_app(app, db) # <--- Inicialización de Flask-Migrate

    # Registrar los Blueprints
    app.register_blueprint(comedor_bp, url_prefix='/comedor')

    return app
