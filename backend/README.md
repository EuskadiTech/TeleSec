# TeleSec Backend

Servidor Python-Flask modular para TeleSec. Proporciona:

- **Autenticación** basada en *tenant* (grupo) + contraseña del tenant
- **Selección de persona** dentro del tenant → JWT con roles
- **RBAC** por roles de Persona (`ADMIN`, `personas`, `personas:edit`, …)
- **Replicación RxDB** pull/push compatible con el protocolo de replicación personalizado de RxDB

## Requisitos

- Python 3.10+
- Dependencias en `requirements.txt`

## Instalación

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edita .env con tus valores secretos
```

## Arrancar el servidor

```bash
# Desde la raíz del proyecto:
python -m backend.run

# O directamente:
cd backend
python run.py
```

Por defecto escucha en `http://localhost:5000`.

## Estructura

```
backend/
├── app.py               # Factory de Flask
├── config.py            # Configuración (env vars)
├── models.py            # Modelos Peewee (SQLite)
├── auth.py              # Autenticación y utilidades de personas
├── rbac.py              # Decoradores RBAC (require_auth, require_role)
├── extensions.py        # Flask-JWT-Extended
├── routes/
│   ├── auth_routes.py   # /api/auth/*
│   └── replicate_routes.py  # /api/replicate/pull · push
└── requirements.txt
```

## API

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register-tenant` | Registrar un nuevo grupo |
| POST | `/api/auth/login` | Autenticar grupo → lista de personas + tenant_token |
| POST | `/api/auth/select-persona` | Seleccionar persona → access_token + refresh_token |
| POST | `/api/auth/bootstrap-admin` | Crear primera persona admin (solo si tenant sin personas) |
| POST | `/api/auth/refresh` | Renovar access_token con refresh_token |

### Replicación RxDB

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/replicate/pull` | Descarga documentos desde el servidor (paginación por cursor) |
| POST | `/api/replicate/push` | Sube cambios locales al servidor |

Todos los endpoints de replicación requieren un Bearer JWT válido (persona completa, no tenant-step).

## Variables de entorno

Ver `.env.example` para la lista completa.

| Variable | Descripción | Defecto |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta Flask | `dev-secret-key-CHANGE-IN-PRODUCTION` |
| `JWT_SECRET_KEY` | Clave para firmar JWTs | `jwt-secret-key-CHANGE-IN-PRODUCTION` |
| `DATABASE_PATH` | Ruta al archivo SQLite | `telesec.db` |
| `CORS_ORIGINS` | Orígenes CORS permitidos | `*` |
| `PORT` | Puerto del servidor | `5000` |
| `FLASK_DEBUG` | Modo depuración | `false` |
