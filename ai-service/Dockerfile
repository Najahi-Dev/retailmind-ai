# ── Build stage: compile/install wheels with the toolchain available ──
FROM python:3.11-slim AS builder

WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Runtime stage: no compilers, non-root user ──
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=app:app main.py ./
COPY --chown=app:app routers ./routers
COPY --chown=app:app schemas ./schemas
COPY --chown=app:app services ./services

USER app
EXPOSE 8000

# AI_SERVICE_API_KEY and ALLOWED_ORIGINS must be provided at runtime.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
