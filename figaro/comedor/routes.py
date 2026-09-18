# app/usuarios/routes.py
from flask import Blueprint, jsonify, request, g, render_template, redirect, flash
from figaro.extensions import breadcrumb, db
from figaro.comedor.models import Menu, Platos
from figaro.comedor.forms import MenuForm, PlatoForm
from datetime import date, timedelta

# Se define el blueprint
comedor_bp = Blueprint('comedor', __name__)

@comedor_bp.route('/', methods=['GET'])
@breadcrumb('Comedor', parent='index.index')
def index():
    menus = Menu.query.all()
    platos = Platos.query.all()
    return render_template("comedor/index.html", menus=menus, platos=platos)

@comedor_bp.route('/quehay', methods=['GET'])
@breadcrumb('¿Que hay de comer?', parent='comedor.index')
def quehay():
    hoy = date.today()

    # Inicio de la semana (lunes)
    inicio_semana = hoy - timedelta(days=hoy.weekday())

    # Menús
    menus = Menu.query.all()

    # Platos de hoy
    platos_hoy = Platos.query.filter(
        Platos.fecha == hoy
    ).all()

    # Platos restantes de esta semana, excluyendo hoy y días pasados
    platos_semana = Platos.query.filter(
        Platos.fecha > hoy,
        Platos.fecha <= inicio_semana + timedelta(days=6)
    ).order_by(
        Platos.fecha.asc()
    ).all()

    return render_template(
        "comedor/quehay.html",
        menus=menus,
        platos=platos_hoy,
        platos_semana=platos_semana
    )

@comedor_bp.route('/menu/', defaults={'id': None}, methods=['GET', 'POST'])
@comedor_bp.route('/menu/<int:id>', methods=['GET', 'POST'])
def menu(id):

    menu = Menu.query.get_or_404(id) if id else None

    form = MenuForm(obj=menu)

    if form.validate_on_submit():

        if menu:
            menu.name = form.name.data
            flash("Menú actualizado.")
        else:
            menu = Menu(
                name=form.name.data
            )
            db.session.add(menu)
            flash("Menú guardado.")

        db.session.commit()
        return redirect('/comedor')

    return render_template(
        'comedor/menu.html',
        form=form,
        menu=menu
    )


@comedor_bp.route('/plato/', defaults={'id': None}, methods=['GET', 'POST'])
@comedor_bp.route('/plato/<int:id>', methods=['GET', 'POST'])
def plato(id):

    plato = Platos.query.get_or_404(id) if id else None

    form = PlatoForm(obj=plato)

    form.menu.choices = [
        (menu.id, menu.name)
        for menu in Menu.query.order_by(Menu.name).all()
    ]

    if plato:
        # SelectField usa menu_id, no el objeto Menu
        form.menu.data = plato.menu_id

    if form.validate_on_submit():

        menu = Menu.query.get_or_404(form.menu.data)

        if plato:
            plato.fecha = form.fecha.data
            plato.menu = menu
            plato.platos = form.platos.data
            flash("Plato actualizado.")
        else:
            plato = Platos(
                fecha=form.fecha.data,
                menu=menu,
                platos=form.platos.data
            )
            db.session.add(plato)
            flash("Plato guardado.")

        db.session.commit()
        return redirect('/comedor')

    return render_template(
        'comedor/plato.html',
        form=form,
        plato=plato
    )