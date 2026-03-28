import json
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from ..models import Document, db
from ..rbac import get_tenant_id, require_auth

bp = Blueprint("replicate", __name__, url_prefix="/api/replicate")


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Pull – RxDB fetches documents from the server
# ---------------------------------------------------------------------------


@bp.route("/pull", methods=["GET"])
@require_auth
def pull():
    """Return documents newer than the supplied checkpoint (cursor-based pagination).

    Query parameters:
      updatedAt  – ISO timestamp of the last seen document
      id         – doc.id of the last seen document (tie-breaker)
      limit      – max documents to return (default 50, max 500)
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return jsonify({"error": "No tenant context"}), 400

    checkpoint_updated_at = (request.args.get("updatedAt") or "").strip()
    checkpoint_id = (request.args.get("id") or "").strip()
    try:
        limit = min(int(request.args.get("limit", 50)), 500)
    except ValueError:
        limit = 50

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

    if documents:
        last = documents[-1]
        checkpoint = {"updatedAt": last["updated_at"], "id": last["id"]}
    elif checkpoint_updated_at:
        checkpoint = {"updatedAt": checkpoint_updated_at, "id": checkpoint_id}
    else:
        checkpoint = {"updatedAt": "", "id": ""}

    return jsonify({"documents": documents, "checkpoint": checkpoint})


# ---------------------------------------------------------------------------
# Push – RxDB sends local writes to the server
# ---------------------------------------------------------------------------


@bp.route("/push", methods=["POST"])
@require_auth
def push():
    """Accept an array of documents from the RxDB client and persist them.

    Returns an empty array on success (no conflicts).  Conflict handling is
    last-write-wins: the server always accepts the incoming document.
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return jsonify({"error": "No tenant context"}), 400

    body = request.get_json(force=True) or []
    if not isinstance(body, list):
        body = [body]

    now = _iso_now()

    with db.atomic():
        for item in body:
            doc_id = (item.get("id") or "").strip()
            if not doc_id:
                continue

            table_name = item.get("table_name") or (
                doc_id.split(":", 1)[0] if ":" in doc_id else "unknown"
            )
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

    return jsonify([])  # no conflicts
