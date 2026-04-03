# Axia4

TeleSec ahora se llama **Axia4**. Este repositorio conserva el nombre histórico `TeleSec`, pero la aplicación, su interfaz y su evolución actual se documentan ya como **Axia4**.

Aparte, TeleSec ahora utiliza RxDB como base de datos, haciendo la plataforma mas rapida.

Axia4 es una aplicación web progresiva orientada a la gestión operativa de grupos, con funcionamiento local-first, soporte offline, sincronización opcional y una arquitectura preparada para desplegar distintas **ediciones** sobre una misma base común.

## Qué incluye este repositorio

- **Frontend PWA** en JavaScript vanilla, HTML y CSS.
- **Build de frontend** con empaquetado de scripts y selección de edición.
- **Backend Flask** para autenticación, control de acceso y replicación.
- **Ediciones** personalizadas que añaden módulos y flujos para casos de uso concretos.

## Estructura principal

```text
.
├── src/                # Núcleo común del frontend
├── assets/             # Recursos estáticos
├── backend/            # API y autenticación Flask
├── EDITIONS/           # Ediciones específicas de la app
├── build.py            # Build y selección de edición
├── package.json        # Dependencias de bundling frontend
└── README.md
```

## Arquitectura

### Frontend

El frontend base vive en `src/` e incluye la lógica común de:

- inicio de sesión
- navegación principal
- base de datos cliente
- PWA y service worker
- módulos comunes de aplicación

El proceso de build copia `assets/`, procesa los archivos fuente y empaqueta los scripts en `dist/`.

### Backend

El backend vive en `backend/` y proporciona:

- autenticación por tenant o grupo
- selección de persona y emisión de JWT
- RBAC por roles
- endpoints de replicación para clientes compatibles

Para más detalle del servidor, consulta [backend/README.md](backend/README.md).

## Ediciones

Axia4 está organizada por ediciones. Cada edición reutiliza la base común y añade páginas, módulos o integraciones específicas.

### Edición base

La base común de la aplicación está en `src/` y contiene el comportamiento general compartido por todas las variantes del producto.

Archivos principales:

- `src/index.html`
- `src/login.js`
- `src/index.js`
- `src/personas.js`
- `src/db.js`
- `src/pwa.js`

### Edición AulaAdapt

La edición actualmente disponible en este repositorio es **AulaAdapt**, ubicada en `EDITIONS/AulaAdapt/`.

Incluye páginas y utilidades específicas para su dominio, por ejemplo:

- asistencia
- aulas
- búsqueda
- comedor
- materiales
- notas
- pagos
- panel
- supercafé

También incorpora un pequeño SDK Python (que esta desactualizado, debido a la migración a RxDB) en `EDITIONS/AulaAdapt/python_sdk/`.

## Cómo se selecciona una edición

El build usa la variable de entorno `TELESEC_EDITION` para decidir qué edición cargar. Si no se indica ninguna, el valor por defecto actual es:

```bash
AulaAdapt
```

Ejemplo de build para una edición concreta:

```bash
TELESEC_EDITION=AulaAdapt python3 build.py
```

Durante el build, `build.py` busca las páginas de la edición en estas rutas candidatas:

- `EDITIONS/<edicion>/pages`
- `EDITIONS/<edicion>/page`
- `src/pages`
- `src/page`

## Desarrollo frontend

### Requisitos

- Python 3
- Node.js y npm

### Instalar dependencias

```bash
npm install
```

### Generar la aplicación

```bash
python3 build.py
```

El resultado se genera en `dist/`.

### Servir en local

```bash
cd dist
python3 -m http.server 8000
```

Después abre:

```text
http://localhost:8000
```

## Desarrollo backend

### Requisitos

- Python 3.10+

### Instalación

```bash
cd backend
pip install -r requirements.txt
```

### Arranque

Desde la raíz del proyecto:

```bash
python -m backend.run
```

O desde `backend/`:

```bash
python run.py
```

Por defecto, el backend escucha en el puerto `5000`.

## Flujo recomendado de trabajo

1. Editar la base común en `src/` o la edición correspondiente en `EDITIONS/`.
2. Ejecutar `python3 build.py`.
3. Servir `dist/` en local.
4. Probar login, navegación y módulos de la edición activa.

## Notas de mantenimiento

- El nombre del repositorio puede seguir siendo `TeleSec`, pero la documentación de producto debe referirse a **Axia4**.
- Las nuevas variantes funcionales deberían añadirse como nuevas carpetas dentro de `EDITIONS/`.
- La lógica común debe mantenerse en `src/` siempre que no dependa de una edición concreta.