import os

from peewee import (
    BooleanField,
    CharField,
    CompositeKey,
    DateTimeField,
    Model,
    SqliteDatabase,
    TextField,
)

_db_path = os.environ.get("DATABASE_PATH", "telesec.db")

db = SqliteDatabase(
    _db_path,
    pragmas={
        "journal_mode": "wal",
        "cache_size": -1024 * 32,
        "foreign_keys": 1,
        "synchronous": "normal",
    },
)


class BaseModel(Model):
    class Meta:
        database = db


class Tenant(BaseModel):
    """A tenant represents a group/organisation that shares a single database namespace."""

    id = CharField(primary_key=True, max_length=100)
    name = CharField(unique=True, max_length=200)
    password_hash = CharField(max_length=256)
    created_at = CharField(max_length=50)

    class Meta:
        table_name = "tenants"


class Document(BaseModel):
    """Stores every TeleSec record as a flat JSON blob.
    Primary key uses the same '<table>:<item_id>' convention as the frontend.
    """

    id = CharField(primary_key=True, max_length=500)
    tenant_id = CharField(max_length=100, index=True)
    table_name = CharField(max_length=100, index=True)
    data = TextField(default="{}")  # JSON string
    # ISO-8601 string stored as text so cursor-based pagination works with simple comparisons
    updated_at = CharField(max_length=50, index=True)
    deleted = BooleanField(default=False)

    class Meta:
        table_name = "documents"
        indexes = (
            # Composite index for efficient pull pagination
            (("tenant_id", "updated_at", "id"), False),
        )


def init_db():
    db.connect(reuse_if_open=True)
    db.create_tables([Tenant, Document], safe=True)
