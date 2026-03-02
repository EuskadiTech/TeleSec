import base64
import email.utils
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import requests
from Crypto.Cipher import AES


class TeleSecCryptoError(Exception):
    pass


class TeleSecCouchDBError(Exception):
    pass


def _pkcs7_pad(data: bytes, block_size: int = 16) -> bytes:
    pad_len = block_size - (len(data) % block_size)
    return data + bytes([pad_len]) * pad_len


def _pkcs7_unpad(data: bytes, block_size: int = 16) -> bytes:
    if not data or len(data) % block_size != 0:
        raise TeleSecCryptoError("Invalid padded data length")
    pad_len = data[-1]
    if pad_len < 1 or pad_len > block_size:
        raise TeleSecCryptoError("Invalid PKCS7 padding")
    if data[-pad_len:] != bytes([pad_len]) * pad_len:
        raise TeleSecCryptoError("Invalid PKCS7 padding bytes")
    return data[:-pad_len]


def _evp_bytes_to_key(passphrase: bytes, salt: bytes, key_len: int, iv_len: int) -> tuple[bytes, bytes]:
    d = b""
    prev = b""
    while len(d) < key_len + iv_len:
        prev = hashlib.md5(prev + passphrase + salt).digest()
        d += prev
    return d[:key_len], d[key_len : key_len + iv_len]


def _json_dumps_like_js(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def ts_encrypt(input_value: Any, secret: str) -> str:
    """
    Compatible with JS: CryptoJS.AES.encrypt(payload, secret).toString()
    wrapped as RSA{<ciphertext>}.
    """
    if secret is None or secret == "":
        if isinstance(input_value, str):
            return input_value
        return _json_dumps_like_js(input_value)

    payload = input_value
    if not isinstance(input_value, str):
        try:
            payload = _json_dumps_like_js(input_value)
        except Exception:
            payload = str(input_value)

    payload_bytes = payload.encode("utf-8")
    salt = os.urandom(8)
    key, iv = _evp_bytes_to_key(secret.encode("utf-8"), salt, 32, 16)
    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    encrypted = cipher.encrypt(_pkcs7_pad(payload_bytes, 16))
    openssl_blob = b"Salted__" + salt + encrypted
    b64 = base64.b64encode(openssl_blob).decode("utf-8")
    return f"RSA{{{b64}}}"


def ts_decrypt(input_value: Any, secret: str) -> Any:
    """
    Compatible with JS TS_decrypt behavior:
    - If not string: return as-is.
    - If RSA{...}: decrypt AES(CryptoJS passphrase mode), parse JSON when possible.
    - If plain string JSON: parse JSON.
    - Else: return raw string.
    """
    if not isinstance(input_value, str):
        return input_value

    is_wrapped = input_value.startswith("RSA{") and input_value.endswith("}")
    if is_wrapped:
        if not secret:
            raise TeleSecCryptoError("Secret is required to decrypt RSA payload")
        b64 = input_value[4:-1]
        try:
            raw = base64.b64decode(b64)
        except Exception as exc:
            raise TeleSecCryptoError("Invalid base64 payload") from exc

        if len(raw) < 16 or not raw.startswith(b"Salted__"):
            raise TeleSecCryptoError("Unsupported encrypted payload format")

        salt = raw[8:16]
        ciphertext = raw[16:]
        key, iv = _evp_bytes_to_key(secret.encode("utf-8"), salt, 32, 16)
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        decrypted = cipher.decrypt(ciphertext)
        decrypted = _pkcs7_unpad(decrypted, 16)

        try:
            text = decrypted.decode("utf-8")
        except UnicodeDecodeError:
            text = decrypted.decode("latin-1")

        try:
            return json.loads(text)
        except Exception:
            return text

    try:
        return json.loads(input_value)
    except Exception:
        return input_value


@dataclass
class TeleSecDoc:
    id: str
    data: Any
    raw: Dict[str, Any]


class TeleSecCouchDB:
    """
    Direct CouchDB client for TeleSec docs (_id = "<table>:<id>").
    No local replication layer.
    """

    def __init__(
        self,
        server_url: str,
        dbname: str,
        secret: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: int = 30,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.server_url = server_url.rstrip("/")
        self.dbname = dbname
        self.secret = secret or ""
        self.timeout = timeout
        self.base_url = f"{self.server_url}/{quote(self.dbname, safe='')}"
        self.session = session or requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        if username is not None:
            self.session.auth = (username, password or "")

    def _iso_now(self) -> str:
        return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    def _doc_id(self, table: str, item_id: str) -> str:
        return f"{table}:{item_id}"

    def _request(self, method: str, path: str = "", **kwargs) -> requests.Response:
        url = self.base_url if not path else f"{self.base_url}/{path.lstrip('/')}"
        kwargs.setdefault("timeout", self.timeout)
        res = self.session.request(method=method, url=url, **kwargs)
        return res

    def get_server_datetime(self) -> datetime:
        """
        Returns server datetime using HTTP Date header from CouchDB.
        Avoids reliance on local machine clock.
        """
        candidates = [
            ("HEAD", self.base_url),
            ("GET", self.base_url),
            ("HEAD", self.server_url),
            ("GET", self.server_url),
        ]
        for method, url in candidates:
            try:
                res = self.session.request(method=method, url=url, timeout=self.timeout)
                date_header = res.headers.get("Date")
                if not date_header:
                    continue
                dt = email.utils.parsedate_to_datetime(date_header)
                if dt is None:
                    continue
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                continue
        raise TeleSecCouchDBError("Unable to retrieve server time from CouchDB Date header")

    def iso_from_server_plus_minutes(self, minutes: int = 0) -> str:
        now = self.get_server_datetime()
        target = now.timestamp() + (minutes * 60)
        out = datetime.fromtimestamp(target, tz=timezone.utc)
        return out.isoformat(timespec="milliseconds").replace("+00:00", "Z")

    def check_connection(self) -> Dict[str, Any]:
        res = self._request("GET")
        if res.status_code >= 400:
            raise TeleSecCouchDBError(f"CouchDB connection failed: {res.status_code} {res.text}")
        return res.json()

    def get_raw(self, doc_id: str) -> Optional[Dict[str, Any]]:
        res = self._request("GET", quote(doc_id, safe=""))
        if res.status_code == 404:
            return None
        if res.status_code >= 400:
            raise TeleSecCouchDBError(f"GET doc failed: {res.status_code} {res.text}")
        return res.json()

    def put_raw(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if "_id" not in doc:
            raise ValueError("Document must include _id")
        res = self._request(
            "PUT",
            quote(doc["_id"], safe=""),
            headers={"Content-Type": "application/json"},
            data=_json_dumps_like_js(doc).encode("utf-8"),
        )
        if res.status_code >= 400:
            raise TeleSecCouchDBError(f"PUT doc failed: {res.status_code} {res.text}")
        return res.json()

    def delete_raw(self, doc_id: str) -> bool:
        doc = self.get_raw(doc_id)
        if not doc:
            return False
        res = self._request("DELETE", f"{quote(doc_id, safe='')}?rev={quote(doc['_rev'], safe='')}")
        if res.status_code >= 400:
            raise TeleSecCouchDBError(f"DELETE doc failed: {res.status_code} {res.text}")
        return True

    def put(self, table: str, item_id: str, data: Any, encrypt: bool = True) -> Dict[str, Any]:
        doc_id = self._doc_id(table, item_id)

        if data is None:
            self.delete_raw(doc_id)
            return {"ok": True, "id": doc_id, "deleted": True}

        existing = self.get_raw(doc_id)
        doc: Dict[str, Any] = existing if existing else {"_id": doc_id}

        to_store = data
        is_encrypted_string = isinstance(data, str) and data.startswith("RSA{") and data.endswith("}")
        if encrypt and self.secret and not is_encrypted_string:
            to_store = ts_encrypt(data, self.secret)

        doc["data"] = to_store
        doc["table"] = table
        doc["ts"] = self._iso_now()

        return self.put_raw(doc)

    def get(self, table: str, item_id: str, decrypt: bool = True) -> Optional[Any]:
        doc_id = self._doc_id(table, item_id)
        doc = self.get_raw(doc_id)
        if not doc:
            return None
        value = doc.get("data")
        if decrypt:
            return ts_decrypt(value, self.secret)
        return value

    def delete(self, table: str, item_id: str) -> bool:
        return self.delete_raw(self._doc_id(table, item_id))

    def list(self, table: str, decrypt: bool = True) -> List[TeleSecDoc]:
        params = {
            "include_docs": "true",
            "startkey": f'"{table}:"',
            "endkey": f'"{table}:\uffff"',
        }
        res = self._request("GET", "_all_docs", params=params)
        if res.status_code >= 400:
            raise TeleSecCouchDBError(f"LIST docs failed: {res.status_code} {res.text}")

        rows = res.json().get("rows", [])
        out: List[TeleSecDoc] = []
        for row in rows:
            doc = row.get("doc") or {}
            item_id = row.get("id", "").split(":", 1)[1] if ":" in row.get("id", "") else row.get("id", "")
            value = doc.get("data")
            if decrypt:
                value = ts_decrypt(value, self.secret)
            out.append(TeleSecDoc(id=item_id, data=value, raw=doc))
        return out
