"""
SocketIO server handlers for real-time data access with RBAC.

Replaces RxDB replication with direct SocketIO communication.
All operations are RBAC-enforced based on the authenticated persona's roles.
"""

import json
from datetime import datetime, timezone
from functools import wraps

from flask import request
from flask_socketio import (
    SocketIO,
    emit,
    join_room,
    leave_room,
)
from flask_jwt_extended import decode_token

from .models import Document
from .rbac import TABLE_EDIT_ROLES


socketio = SocketIO()
SOCKET_CONTEXT: dict[str, dict] = {}


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def get_persona_roles(tenant_id: str, persona_id: str) -> list:
    """Fetch roles for a persona from the database."""
    try:
        doc = Document.get(
            (Document.id == f"personas:{persona_id}")
            & (Document.tenant_id == tenant_id)
        )
        data = json.loads(doc.data) if doc.data else {}
        return data.get("Roles", [])
    except Document.DoesNotExist:
        return []


def can_access_table(table_name: str, roles: list) -> bool:
    """Check if roles can read from this table."""
    if "ADMIN" in roles:
        return True
    print(f"Checking access for table '{table_name}' with roles {roles}")
    # For now: all tables are readable; only write is restricted
    return True


def can_edit_table(table_name: str, roles: list) -> bool:
    """Check if roles can write to this table."""
    table_lower = table_name.lower()
    if "ADMIN" in roles:
        return True
    required_roles = TABLE_EDIT_ROLES.get(table_lower, [])
    if not required_roles:
        # If not in TABLE_EDIT_ROLES, only ADMIN can edit
        return False
    return any(r in roles for r in required_roles)


def socketio_auth_required(f):
    """Decorator: verify the socket has an authenticated context."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        sid = request.sid
        ctx = SOCKET_CONTEXT.get(sid)
        if not ctx:
            emit("db:error", {"message": "Authentication failed: socket not authenticated"})
            return

        request.sid_tenant_id = ctx.get("tenant_id", "")
        request.sid_persona_id = ctx.get("persona_id", "")
        request.sid_roles = ctx.get("roles", [])

        return f(*args, **kwargs)

    return wrapper


# ============================================================================
# SocketIO Connection / Disconnection
# ============================================================================


@socketio.on("connect")
def handle_connect(auth):
    """Client connects with JWT token in auth data."""
    try:
        if not auth or "token" not in auth:
            emit("error", {"message": "Missing token"})
            return False

        token = auth["token"]
        try:
            claims = decode_token(token)
        except Exception:
            emit("error", {"message": "Invalid token"})
            return False

        if claims.get("step") == "select_persona":
            emit("error", {"message": "Se requiere seleccionar una persona primero"})
            return False

        tenant_id = claims.get("tenant_id", "")
        persona_id = claims.get("sub", "")
        if not tenant_id or not persona_id:
            emit("error", {"message": "Invalid token context"})
            return False

        roles = get_persona_roles(tenant_id, persona_id)
        SOCKET_CONTEXT[request.sid] = {
            "tenant_id": tenant_id,
            "persona_id": persona_id,
            "roles": roles,
        }

        # Store tenant and persona in request context for this socket
        request.sid_tenant_id = tenant_id
        request.sid_persona_id = persona_id
        request.sid_roles = roles

        # Join a room for this tenant so we can broadcast changes
        tenant_room = f"tenant:{tenant_id}"
        join_room(tenant_room)

        emit("connected", {"tenant_id": tenant_id})
        return True
    except Exception as e:
        emit("error", {"message": str(e)})
        return False


@socketio.on("disconnect")
def handle_disconnect():
    """Client disconnects."""
    SOCKET_CONTEXT.pop(request.sid, None)


# ============================================================================
# Core data operations: get, list, put, del
# ============================================================================


@socketio.on("db:get")
@socketio_auth_required
def handle_db_get(data):
    """Get a single document with RBAC check."""
    table = data.get("table")
    id_val = data.get("id")

    if not table or not id_val:
        emit("db:error", {"message": "table and id required"})
        return

    tenant_id = getattr(request, "sid_tenant_id", "")
    roles = getattr(request, "sid_roles", [])

    if not can_access_table(table, roles):
        emit("db:error", {"message": "Access denied to this table"})
        return

    docid = f"{table}:{id_val}"
    try:
        doc = Document.get(
            (Document.id == docid) & (Document.tenant_id == tenant_id)
        )
        data_obj = json.loads(doc.data) if doc.data else {}
        emit("db:get", {"id": id_val, "data": data_obj})
    except Document.DoesNotExist:
        emit("db:get", {"id": id_val, "data": None})


@socketio.on("db:list")
@socketio_auth_required
def handle_db_list(data):
    """List all documents in a table with RBAC check."""
    table = data.get("table")
    if not table:
        emit("db:error", {"message": "table required"})
        return

    tenant_id = getattr(request, "sid_tenant_id", "")
    roles = getattr(request, "sid_roles", [])

    if not can_access_table(table, roles):
        emit("db:error", {"message": "Access denied to this table"})
        return

    try:
        docs = Document.select().where(
            (Document.tenant_id == tenant_id)
            & (Document.table_name == table)
            & (Document.deleted == False)
        )

        rows = []
        for doc in docs:
            try:
                data_obj = json.loads(doc.data) if doc.data else {}
            except Exception:
                data_obj = {}

            # Extract id from 'table:id' format
            sep = doc.id.rfind(":")
            item_id = doc.id[sep + 1 :] if sep >= 0 else doc.id

            rows.append({"id": item_id, "data": data_obj})

        emit("db:list", {"table": table, "rows": rows})
    except Exception as e:
        emit("db:error", {"message": str(e)})


@socketio.on("db:put")
@socketio_auth_required
def handle_db_put(data):
    """Create or update a document with RBAC check."""
    table = data.get("table")
    id_val = data.get("id")
    doc_data = data.get("data")

    if not table or not id_val or doc_data is None:
        emit("db:error", {"message": "table, id, and data required"})
        return

    tenant_id = getattr(request, "sid_tenant_id", "")
    roles = getattr(request, "sid_roles", [])

    if not can_edit_table(table, roles):
        emit(
            "db:error",
            {
                "message": f"Write access denied to table '{table}'",
                "required_roles": TABLE_EDIT_ROLES.get(table.lower(), ["ADMIN"]),
            },
        )
        return

    docid = f"{table}:{id_val}"
    now = _iso_now()

    try:
        existing = None
        try:
            existing = Document.get(
                (Document.id == docid) & (Document.tenant_id == tenant_id)
            )
        except Document.DoesNotExist:
            pass

        if existing:
            existing.data = json.dumps(doc_data)
            existing.updated_at = now
            existing.deleted = False
            existing.save()
        else:
            Document.create(
                id=docid,
                tenant_id=tenant_id,
                table_name=table,
                data=json.dumps(doc_data),
                updated_at=now,
                deleted=False,
            )

        # Broadcast to all clients in the tenant room
        tenant_room = f"tenant:{tenant_id}"
        socketio.emit(
            "db:changed",
            {
                "event": "put",
                "table": table,
                "id": id_val,
                "data": doc_data,
                "updated_at": now,
            },
            room=tenant_room,
            skip_sid=None,  # Send to all, including the sender
        )

        emit("db:put", {"id": id_val, "status": "ok"})
    except Exception as e:
        emit("db:error", {"message": str(e)})


@socketio.on("db:del")
@socketio_auth_required
def handle_db_del(data):
    """Delete a document (soft delete) with RBAC check."""
    table = data.get("table")
    id_val = data.get("id")

    if not table or not id_val:
        emit("db:error", {"message": "table and id required"})
        return

    tenant_id = getattr(request, "sid_tenant_id", "")
    roles = getattr(request, "sid_roles", [])

    if not can_edit_table(table, roles):
        emit("db:error", {"message": "Write access denied to this table"})
        return

    docid = f"{table}:{id_val}"

    try:
        doc = Document.get(
            (Document.id == docid) & (Document.tenant_id == tenant_id)
        )
        doc.deleted = True
        doc.updated_at = _iso_now()
        doc.save()

        # Broadcast deletion
        tenant_room = f"tenant:{tenant_id}"
        socketio.emit(
            "db:changed",
            {
                "event": "del",
                "table": table,
                "id": id_val,
            },
            room=tenant_room,
        )

        emit("db:del", {"id": id_val, "status": "ok"})
    except Document.DoesNotExist:
        emit("db:del", {"id": id_val, "status": "ok"})  # Idempotent
    except Exception as e:
        emit("db:error", {"message": str(e)})


# ============================================================================
# Streaming: subscribe to real-time changes in a table
# ============================================================================


@socketio.on("db:subscribe")
@socketio_auth_required
def handle_db_subscribe(data):
    """Subscribe to real-time changes in a table."""
    table = data.get("table")
    if not table:
        emit("db:error", {"message": "table required"})
        return

    roles = getattr(request, "sid_roles", [])
    if not can_access_table(table, roles):
        emit("db:error", {"message": "Access denied to this table"})
        return

    # Join a room for this table
    table_room = f"table:{table}"
    join_room(table_room)

    emit("db:subscribed", {"table": table})


@socketio.on("db:unsubscribe")
@socketio_auth_required
def handle_db_unsubscribe(data):
    """Unsubscribe from real-time changes in a table."""
    table = data.get("table")
    if not table:
        emit("db:error", {"message": "table required"})
        return

    table_room = f"table:{table}"
    leave_room(table_room)

    emit("db:unsubscribed", {"table": table})


# ============================================================================
# Heartbeat / Keep-alive
# ============================================================================


@socketio.on("ping")
def handle_ping():
    """Respond to client ping for keep-alive."""
    emit("pong", {"timestamp": _iso_now()})
