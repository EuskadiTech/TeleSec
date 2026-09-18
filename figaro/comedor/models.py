from figaro.extensions import db


class Menu(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128))

    platos = db.relationship(
        'Platos',
        back_populates='menu',
        cascade='all, delete-orphan'
    )


class Platos(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date(), nullable=False)

    menu_id = db.Column(
        db.Integer,
        db.ForeignKey('menu.id'),
        nullable=False
    )

    menu = db.relationship(
        'Menu',
        back_populates='platos'
    )

    platos = db.Column(db.String(512), nullable=False)