# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def breadcrumb(title, parent=None):
    """Attach breadcrumb metadata to a view function.

    ``parent`` is the endpoint name of the previous breadcrumb.
    """
    def decorator(view):
        view._breadcrumb_title = title
        view._breadcrumb_parent = parent
        return view

    return decorator
