from flask import Blueprint, render_template, g
from figaro.extensions import breadcrumb

index_bp = Blueprint('index', __name__)

@index_bp.route('/')
@breadcrumb('Inicio')
def index():
    return render_template('index.html')
