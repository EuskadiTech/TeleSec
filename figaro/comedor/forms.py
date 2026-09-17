from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired

class NuevoMenu(FlaskForm):
    name = StringField('Nombre', validators=[DataRequired()])