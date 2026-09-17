# app/usuarios/routes.py
from flask import Blueprint, jsonify, request, g, render_template, redirect, flash
from figaro.extensions import breadcrumb, db
from figaro.comedor.models import Menu
from figaro.comedor.forms import NuevoMenu

# Se define el blueprint
comedor_bp = Blueprint('comedor', __name__)

@comedor_bp.route('/', methods=['GET'])
@breadcrumb('Comedor', parent='index.index')
def index():
    # Consulta a la base de datos usando el modelo
    menus = Menu.query.all()
    return render_template("comedor/index.html", menus=menus)

@comedor_bp.route('/newMenu', methods=['GET', 'POST'])
@breadcrumb('Nuevo menú', parent='comedor.index')
def crear_menu():
    form = NuevoMenu()
    if form.validate_on_submit():
        datos = request.form
        nuevo_menu = Menu(name=datos['name'])
        db.session.add(nuevo_menu)
        db.session.commit()
        flash("Menú guardado.")
        return redirect('/comedor')
    return render_template('comedor/newMenu.html', form=form)
