# ── Build stage: install Python deps + Node.js + bundle frontend ─────────────
FROM python:3.12-slim AS builder

# Node.js for esbuild (frontend bundling via build.py)
RUN apt-get update && \
    apt-get install -y --no-install-recommends nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python venv
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY django/requirements.txt ./django/requirements.txt
RUN pip install --no-cache-dir -r django/requirements.txt

# Copy everything needed for the frontend build
COPY package.json package-lock.json* ./
COPY src/ src/
COPY assets/ assets/
# Edition pages are optional – use a glob so the COPY doesn't fail if absent
COPY build.py .
# Copy optional EDITIONS directory (ignore if not present via shell workaround)
RUN mkdir -p EDITIONS
COPY EDITIONS/ EDITIONS/

# Build frontend assets → dist/
RUN python build.py

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

LABEL org.opencontainers.image.title="TeleSec Django"
LABEL org.opencontainers.image.description="Django SSR backend for TeleSec – modular, single-instance, no RxDB"

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Django project
COPY django/ ./django/
# Built frontend static files (served by WhiteNoise at /)
COPY --from=builder /app/dist/ ./dist/
# Module package catalog
COPY catalog/ ./catalog/

# Persistent data dir
RUN mkdir -p /data

ENV DJANGO_SETTINGS_MODULE=telesec.settings \
    DJANGO_DEBUG=false \
    PORT=8000 \
    DATABASE_PATH=/data/telesec.db \
    CORS_ORIGINS=* \
    SECRET_KEY=change-this-to-a-long-random-string \
    JWT_SECRET_KEY=change-this-jwt-secret-too

EXPOSE 8000

WORKDIR /app/django

# Migrate DB, load catalog, auto-install free packages, then serve
CMD ["sh", "-c", \
  "python manage.py migrate --run-syncdb --noinput && \
   python manage.py setup_instance --load-catalog && \
   gunicorn --workers 2 --threads 4 --bind 0.0.0.0:${PORT} telesec.wsgi:application"]
