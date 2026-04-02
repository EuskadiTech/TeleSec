# ---- build stage ----
FROM python:3.12-slim AS builder

WORKDIR /app

# Install dependencies into a venv so we can copy just the venv to the final image
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ---- runtime stage ----
FROM python:3.12-slim

LABEL org.opencontainers.image.title="TeleSec Backend"
LABEL org.opencontainers.image.description="Python-Flask backend for TeleSec (auth + RBAC + RxDB replication)"

WORKDIR /app

# Copy the pre-built venv from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy only what the application needs
COPY ./ ./backend/

# Data directory for SQLite
RUN mkdir -p /data

# Environment variable defaults (overridden at runtime via docker-compose or -e flags)
ENV FLASK_DEBUG=false \
    PORT=5000 \
    DATABASE_PATH=/data/telesec.db \
    CORS_ORIGINS=*

EXPOSE 5000

# Run with gunicorn for production; fall back to Flask dev server when DEBUG=true
CMD ["sh", "-c", \
     "if [ \"$FLASK_DEBUG\" = 'true' ]; then \
        python -m backend.run; \
      else \
        gunicorn --workers 2 --threads 4 --bind 0.0.0.0:${PORT} 'backend.app:create_app()'; \
      fi"]
