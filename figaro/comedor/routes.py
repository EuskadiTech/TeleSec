# app/usuarios/routes.py
from flask import Blueprint, jsonify, request
from figaro.extensions import db
from figaro.comedor.models import Menu

# Se define el blueprint
comedor_bp = Blueprint('usuarios', __name__)

@comedor_bp.route('/', methods=['GET'])
def listar_usuarios():
    # Consulta a la base de datos usando el modelo
    menus = Menu.query.all()
    return jsonify([{"id": u.id, "nombre": u.nombre} for u in menus])

@comedor_bp.route('/', methods=['POST'])
def crear_usuario():
    datos = request.json
    nuevo_menu = Menu(nombre=datos['nombre'])
    db.session.add(nuevo_menu)
    db.session.commit()
    return jsonify({"mensaje": "Menú creado con éxito"}), 201
