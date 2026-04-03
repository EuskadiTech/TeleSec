import json
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from ..models import Document, db
from ..auth import get_persona_roles
from ..rbac import can_access_table, can_edit_table, get_persona_id, get_tenant_id, require_auth

bp = Blueprint("replicate", __name__, url_prefix="/api/replicate")


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Pull - RxDB fetches documents from the server
# ---------------------------------------------------------------------------


@bp.route("/pull", methods=["GET"])
@require_auth
def pull():
    """Return authorized documents newer than the supplied checkpoint.

    Query parameters:
      updatedAt  - ISO timestamp of the last seen document
      id         - doc.id of the last seen document (tie-breaker)
      limit      - max documents to return (default 50, max 500)

    RBAC is enforced per-document using current roles from the database.
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return jsonify({"error": "No tenant context"}), 400

    persona_id = get_persona_id()
    if not persona_id:
        return jsonify({"error": "No persona context"}), 400

    checkpoint_updated_at = (request.args.get("updatedAt") or "").strip()
    checkpoint_id = (request.args.get("id") or "").strip()
    try:
        limit = min(int(request.args.get("limit", 50)), 500)
    except ValueError:
        limit = 50

    roles = get_persona_roles(tenant_id, persona_id)

    query = Document.select().where(Document.tenant_id == tenant_id)

    if checkpoint_updated_at:
        query = query.where(
            (Document.updated_at > checkpoint_updated_at)
            | (
                (Document.updated_at == checkpoint_updated_at)
                & (Document.id > checkpoint_id)
            )
        )

    query = query.order_by(Document.updated_at.asc(), Document.id.asc()).limit(limit)

    docs = list(query)
    documents = []
    for doc in docs:
        if not can_access_table(doc.table_name, roles):
            continue
        try: 
            data = json.loads(doc.data)
        except Exception:
            data = {}
        documents.append(
            {
                "id": doc.id,
                "table_name": doc.table_name,
                "data": data,
                "updated_at": str(doc.updated_at),
                "_deleted": bool(doc.deleted),
            }
        )

    if docs:
        last_scanned = docs[-1]
        checkpoint = {"updatedAt": str(last_scanned.updated_at), "id": last_scanned.id}
    elif checkpoint_updated_at:
        checkpoint = {"updatedAt": checkpoint_updated_at, "id": checkpoint_id}
    else:
        checkpoint = {"updatedAt": "", "id": ""}

    return jsonify({"documents": documents, "checkpoint": checkpoint})


# ---------------------------------------------------------------------------
# Push - RxDB sends local writes to the server
# ---------------------------------------------------------------------------


@bp.route("/push", methods=["POST"])
@require_auth
def push():
    """Accept an array of documents from the RxDB client and persist them.

    Per-document RBAC is enforced by re-reading the persona's current roles
    from the database (not the JWT) so that revoked permissions take effect
    immediately.  Documents in tables where the authenticated persona lacks
    edit permission are rejected: the server's current state is returned as a
    conflict so that RxDB reverts those documents on the client.  Documents
    the persona *is* allowed to write are persisted with last-write-wins
    semantics.

    Returns a (possibly empty) array of conflicting master-state documents.
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return jsonify({"error": "No tenant context"}), 400

    persona_id = get_persona_id()
    if not persona_id:
        return jsonify({"error": "No persona context"}), 400

    body = request.get_json(force=True) or []
    if not isinstance(body, list):
        body = [body]

    roles = get_persona_roles(tenant_id, persona_id)
    now = _iso_now()
    conflicts = []

    with db.atomic():
        for item in body:
            doc_id = (item.get("id") or "").strip()
            if not doc_id:
                continue

            table_name = item.get("table_name") or (
                doc_id.split(":", 1)[0] if ":" in doc_id else "unknown"
            )

            # RBAC: check whether this persona may write to this table.
            if not can_edit_table(table_name, roles):
                # Return the server's authoritative state so RxDB reverts the
                # client's change for this document.
                try:
                    existing = Document.get(
                        (Document.id == doc_id) & (Document.tenant_id == tenant_id)
                    )
                    try:
                        existing_data = json.loads(existing.data)
                    except json.JSONDecodeError:
                        existing_data = {}
                    conflicts.append(
                        {
                            "id": existing.id,
                            "table_name": existing.table_name,
                            "data": existing_data,
                            "updated_at": str(existing.updated_at),
                            "_deleted": bool(existing.deleted),
                        }
                    )
                except Document.DoesNotExist:
                    # No server copy exists; signal a conflict with a
                    # tombstone so the client discards its local write.
                    conflicts.append(
                        {
                            "id": doc_id,
                            "table_name": table_name,
                            "data": {},
                            "updated_at": now,
                            "_deleted": True,
                        }
                    )
                continue

            data = item.get("data") or {}
            deleted = bool(item.get("_deleted", False))
            data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

            try:
                existing = Document.get(
                    (Document.id == doc_id) & (Document.tenant_id == tenant_id)
                )
                existing.data = data_json
                existing.table_name = table_name
                existing.deleted = deleted
                existing.updated_at = now
                existing.save()
            except Document.DoesNotExist:
                Document.create(
                    id=doc_id,
                    tenant_id=tenant_id,
                    table_name=table_name,
                    data=data_json,
                    deleted=deleted,
                    updated_at=now,
                )

    return jsonify(conflicts)
