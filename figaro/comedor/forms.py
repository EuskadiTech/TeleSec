from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, TextAreaField
from wtforms.fields import DateField
from wtforms.validators import DataRequired


class MenuForm(FlaskForm):
    name = StringField(
        'Nombre',
        validators=[DataRequired()]
    )


class PlatoForm(FlaskForm):
    fecha = DateField(
        'Fecha',
        format='%Y-%m-%d',
        validators=[DataRequired()]
    )

    menu = SelectField(
        'Menú',
        coerce=int,
        validators=[DataRequired()]
    )

    platos = TextAreaField(
        'Platos',
        validators=[DataRequired()]
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.menu.choices = []
