# TeleSec
Nuevo programa de datos

## Python SDK (CouchDB directo)

Se añadió un SDK Python en `python_sdk/` para acceder directamente a CouchDB (sin replicación local), compatible con el formato de cifrado de `TS_encrypt`:

- Formato: `RSA{...}`
- Algoritmo: `CryptoJS.AES.encrypt(payload, secret)` (modo passphrase/OpenSSL)

### Instalación

```bash
pip install -r requirements.txt
```

### Uso rápido

```python
from python_sdk import TeleSecCouchDB

db = TeleSecCouchDB(
	server_url="https://tu-couchdb",
	dbname="telesec",
	username="usuario",
	password="clave",
	secret="SECRET123",
)

# Guardar cifrado (como TS_encrypt)
db.put("personas", "abc123", {"nombre": "Ana"}, encrypt=True)

# Leer y descifrar
obj = db.get("personas", "abc123", decrypt=True)

# Listar una tabla
rows = db.list("personas", decrypt=True)
for row in rows:
	print(row.id, row.data)
```

API principal:

- `TeleSecCouchDB.put(table, item_id, data, encrypt=True)`
- `TeleSecCouchDB.get(table, item_id, decrypt=True)`
- `TeleSecCouchDB.list(table, decrypt=True)`
- `TeleSecCouchDB.delete(table, item_id)`
- `ts_encrypt(value, secret)` / `ts_decrypt(value, secret)`

## Agente Windows (Gest-Aula > Ordenadores)

Se añadió soporte para control de ordenadores del aula:

- Tabla: `aulas_ordenadores`
- Campos reportados por agente: `Hostname`, `UsuarioActual`, `AppActualEjecutable`, `AppActualTitulo`, `LastSeenAt`
- Control remoto: `ShutdownBeforeDate` (programado desde web a `hora_servidor + 2 minutos`)

### Ejecutar agente en Windows

```bash
python -m python_sdk.windows_agent \
	--server "https://tu-couchdb" \
	--db "telesec" \
	--user "usuario" \
	--password "clave" \
	--secret "SECRET123"
```

Opciones útiles:

- `--once`: una sola iteración
- `--interval 15`: intervalo (segundos)
- `--dry-run`: no apaga realmente, solo simula

### Hora de servidor (sin depender del reloj local)

El frontend y el agente usan la hora del servidor (cabecera HTTP `Date` de CouchDB) para comparar `ShutdownBeforeDate`.
