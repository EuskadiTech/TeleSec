import argparse
import ctypes
import os
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import psutil

try:
    from .telesec_couchdb import TeleSecCouchDB, TeleSecCouchDBError, ts_decrypt
except ImportError:
    from telesec_couchdb import TeleSecCouchDB, TeleSecCouchDBError, ts_decrypt


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
    parser.add_argument("--server", required=True, help="CouchDB server URL, ej. https://couch.example")
    parser.add_argument("--db", default="telesec", help="Database name")
    parser.add_argument("--user", default="", help="CouchDB username")
    parser.add_argument("--password", default="", help="CouchDB password")
    parser.add_argument("--secret", required=True, help="TeleSec secret para cifrado")
    parser.add_argument("--machine-id", default="", help="ID de máquina (default: hostname)")
    parser.add_argument("--interval", type=int, default=15, help="Intervalo en segundos")
    parser.add_argument("--once", action="store_true", help="Ejecutar una sola iteración")
    parser.add_argument("--dry-run", action="store_true", help="No apagar realmente, solo log")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    machine_id = (args.machine_id or socket.gethostname() or "unknown-host").strip()

    client = TeleSecCouchDB(
        server_url=args.server,
        dbname=args.db,
        secret=args.secret,
        username=args.user or None,
        password=args.password or None,
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
        time.sleep(max(5, args.interval))


if __name__ == "__main__":
    raise SystemExit(main())
