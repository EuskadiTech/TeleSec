"""RxDB replication endpoints – pull and push.

GET  /api/replicate/pull   ?updatedAt=&id=&limit=
POST /api/replicate/push   [ { id, table_name, data, _deleted } ]
"""
import json
from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from ..auth_helpers import get_persona_roles
from ..models import Document
from ..rbac import IsPersonaAuthenticated, can_access_table, can_edit_table


from ..utils import iso_now


def _iso_now() -> str:
    return iso_now()


class PullView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def get(self, request):
        persona_id = request.user.persona_id
        roles = get_persona_roles(persona_id)

        checkpoint_updated_at = (request.query_params.get("updatedAt") or "").strip()
        checkpoint_id = (request.query_params.get("id") or "").strip()
        try:
            limit = min(int(request.query_params.get("limit", 50)), 500)
        except (TypeError, ValueError):
            limit = 50

        qs = Document.objects.all()
        if checkpoint_updated_at:
            qs = qs.filter(
                updated_at__gt=checkpoint_updated_at
            ) | qs.filter(
                updated_at=checkpoint_updated_at,
                id__gt=checkpoint_id,
            )

        docs = list(qs.order_by("updated_at", "id")[:limit])

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
                    "updated_at": doc.updated_at,
                    "_deleted": bool(doc.deleted),
                }
            )

        if docs:
            last = docs[-1]
            checkpoint = {"updatedAt": last.updated_at, "id": last.id}
        elif checkpoint_updated_at:
            checkpoint = {"updatedAt": checkpoint_updated_at, "id": checkpoint_id}
        else:
            checkpoint = {"updatedAt": "", "id": ""}

        return Response({"documents": documents, "checkpoint": checkpoint})


class PushView(APIView):
    permission_classes = [IsPersonaAuthenticated]

    def post(self, request):
        persona_id = request.user.persona_id
        roles = get_persona_roles(persona_id)

        body = request.data
        if not isinstance(body, list):
            body = [body]

        now = _iso_now()
        conflicts = []

        with transaction.atomic():
            for item in body:
                doc_id = (item.get("id") or "").strip()
                if not doc_id:
                    continue

                table_name = item.get("table_name") or (
                    doc_id.split(":", 1)[0] if ":" in doc_id else "unknown"
                )

                if not can_edit_table(table_name, roles):
                    # Return server's current state as conflict
                    try:
                        existing = Document.objects.get(id=doc_id)
                        try:
                            existing_data = json.loads(existing.data)
                        except Exception:
                            existing_data = {}
                        conflicts.append(
                            {
                                "id": existing.id,
                                "table_name": existing.table_name,
                                "data": existing_data,
                                "updated_at": existing.updated_at,
                                "_deleted": bool(existing.deleted),
                            }
                        )
                    except Document.DoesNotExist:
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

                Document.objects.update_or_create(
                    id=doc_id,
                    defaults={
                        "table_name": table_name,
                        "data": data_json,
                        "deleted": deleted,
                        "updated_at": now,
                    },
                )

        return Response(conflicts)
