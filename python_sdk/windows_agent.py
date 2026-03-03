import argparse
import ctypes
import json
import os
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

import psutil
import base64
import email.utils
import hashlib
from dataclasses import dataclass
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


def ts_encrypt(input_value: Any, secret: str) -> str:
    if not isinstance(input_value, str):
        payload = json.dumps(input_value, separators=(",", ":"), ensure_ascii=False)
    else:
        payload = input_value

    payload_bytes = payload.encode("utf-8")
    salt = os.urandom(8)

    # OpenSSL EVP_BytesToKey (MD5)
    dx = b""
    salted = b""
    while len(salted) < 48:  # 32 key + 16 iv
        dx = hashlib.md5(dx + secret.encode() + salt).digest()
        salted += dx

    key = salted[:32]
    iv = salted[32:48]

    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(_pkcs7_pad(payload_bytes, 16))

    openssl_blob = b"Salted__" + salt + encrypted
    b64 = base64.b64encode(openssl_blob).decode("utf-8")

    return f"RSA{{{b64}}}"

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

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_iso(value: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        v = value.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def get_current_username() -> str:
    try:
        return psutil.Process().username() or os.getlogin()
    except Exception:
        try:
            return os.getlogin()
        except Exception:
            return os.environ.get("USERNAME", "")


def _window_title(hwnd: int) -> str:
    buf_len = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
    if buf_len <= 0:
        return ""
    buf = ctypes.create_unicode_buffer(buf_len + 1)
    ctypes.windll.user32.GetWindowTextW(hwnd, buf, buf_len + 1)
    return buf.value or ""


def get_active_app() -> Dict[str, str]:
    exe = ""
    title = ""
    try:
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        if hwnd:
            title = _window_title(hwnd)
            pid = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value:
                try:
                    proc = psutil.Process(pid.value)
                    exe = proc.name() or ""
                except Exception:
                    exe = ""
    except Exception:
        pass
    return {"exe": exe, "title": title}


def build_payload(machine_id: str) -> Dict[str, Any]:
    app = get_active_app()
    return {
        "Hostname": machine_id,
        "UsuarioActual": get_current_username(),
        "AppActualEjecutable": app.get("exe", ""),
        "AppActualTitulo": app.get("title", ""),
        # campo local diagnóstico (no se usa para decisión remota)
        "AgentLocalSeenAt": utcnow_iso(),
    }


def should_shutdown(data: Dict[str, Any], server_now: datetime) -> bool:
    target = parse_iso(str(data.get("ShutdownBeforeDate", "") or ""))
    if not target:
        return False
    return server_now >= target


def execute_shutdown(dry_run: bool = False) -> None:
    if dry_run:
        print("[DRY-RUN] Ejecutaría: shutdown /s /t 0 /f")
        return
    subprocess.run(["shutdown", "/s", "/t", "0", "/f"], check=False)


def run_once(client: TeleSecCouchDB, machine_id: str, dry_run: bool = False) -> None:
    server_now = client.get_server_datetime()
    server_now_iso = server_now.isoformat(timespec="milliseconds").replace("+00:00", "Z")

    raw = client.get(table="aulas_ordenadores", item_id=machine_id, decrypt=False)
    current: Dict[str, Any] = {}
    if raw is not None:
        current = ts_decrypt(raw, client.secret)
        if not isinstance(current, dict):
            current = {}

    update = build_payload(machine_id)
    update["LastSeenAt"] = server_now_iso

    for key in ["ShutdownBeforeDate", "ShutdownRequestedAt", "ShutdownRequestedBy"]:
        if key in current:
            update[key] = current.get(key)

    client.put(table="aulas_ordenadores", item_id=machine_id, data=update, encrypt=True)

    if should_shutdown(update, server_now):
        print(f"[{server_now_iso}] ShutdownBeforeDate alcanzado. Apagando {machine_id}...")
        execute_shutdown(dry_run=dry_run)
    else:
        print(
            f"[{server_now_iso}] Reportado {machine_id} user={update.get('UsuarioActual','')} "
            f"exe={update.get('AppActualEjecutable','')} title={update.get('AppActualTitulo','')}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="TeleSec Windows Agent")
    parser.add_argument("--server", default="", help="CouchDB server URL, ej. https://couch.example")
    parser.add_argument("--db", default="", help="Database name")
    parser.add_argument("--user", default="", help="CouchDB username")
    parser.add_argument("--password", default="", help="CouchDB password")
    parser.add_argument("--secret", default="", help="TeleSec secret para cifrado")
    parser.add_argument("--machine-id", default="", help="ID de máquina (default: hostname)")
    parser.add_argument("--interval", type=int, default=15, help="Intervalo en segundos")
    parser.add_argument("--once", action="store_true", help="Ejecutar una sola iteración")
    parser.add_argument("--dry-run", action="store_true", help="No apagar realmente, solo log")
    parser.add_argument(
        "--config",
        default="",
        help="Ruta de config JSON (default: ~/.telesec/windows_agent.json)",
    )
    return parser.parse_args()


def _default_config_path() -> str:
    return os.path.join(os.path.expanduser("~"), ".telesec", "windows_agent.json")


def _load_or_init_config(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        default_cfg = {
            "server": "https://tu-couchdb",
            "db": "telesec",
            "user": "",
            "password": "",
            "secret": "",
            "machine_id": "",
            "interval": 15,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default_cfg, f, ensure_ascii=False, indent=2)
        return default_cfg

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, dict):
            return data
        return {}


def _save_config(path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _pick(cli_value: Any, cfg_value: Any, default_value: Any = None) -> Any:
    if cli_value is None:
        return cfg_value if cfg_value not in [None, ""] else default_value
    if isinstance(cli_value, str):
        if cli_value.strip() == "":
            return cfg_value if cfg_value not in [None, ""] else default_value
        return cli_value
    return cli_value


def main() -> int:
    args = parse_args()
    config_path = args.config or _default_config_path()
    try:
        cfg = _load_or_init_config(config_path)
    except Exception as exc:
        print(f"No se pudo cargar/crear config en {config_path}: {exc}", file=sys.stderr)
        return 3

    server = _pick(args.server, cfg.get("server"), "")
    db = _pick(args.db, cfg.get("db"), "telesec")
    user = _pick(args.user, cfg.get("user"), "")
    password = _pick(args.password, cfg.get("password"), "")
    secret = _pick(args.secret, cfg.get("secret"), "")
    machine_id = _pick(args.machine_id, cfg.get("machine_id"), "")
    interval = _pick(args.interval, cfg.get("interval"), 15)

    machine_id = (machine_id or socket.gethostname() or "unknown-host").strip()

    if not server or not secret:
        print(
            "Falta configuración obligatoria. Edita el JSON en: " + config_path,
            file=sys.stderr,
        )
        return 4

    # Persist effective parameters for next runs
    try:
        persistent_cfg = {
            "server": server,
            "db": db,
            "user": user,
            "password": password,
            "secret": secret,
            "machine_id": machine_id,
            "interval": int(interval),
        }
        _save_config(config_path, persistent_cfg)
    except Exception as exc:
        print(f"No se pudo guardar config en {config_path}: {exc}", file=sys.stderr)

    client = TeleSecCouchDB(
        server_url=server,
        dbname=db,
        secret=secret,
        username=user or None,
        password=password or None,
    )

    try:
        client.check_connection()
    except TeleSecCouchDBError as exc:
        print(f"Error de conexión CouchDB: {exc}", file=sys.stderr)
        return 2

    if args.once:
        run_once(client=client, machine_id=machine_id, dry_run=args.dry_run)
        return 0

    while True:
        try:
            run_once(client=client, machine_id=machine_id, dry_run=args.dry_run)
        except Exception as exc:
            print(f"Error en iteración agente: {exc}", file=sys.stderr)
        time.sleep(max(5, int(interval)))


if __name__ == "__main__":
    raise SystemExit(main())
