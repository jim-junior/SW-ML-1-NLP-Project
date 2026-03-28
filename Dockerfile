# ── Base: CUDA 12.4 runtime on Ubuntu 24.04 (Noble) ─────────────────────────
# cuda 13.x does not exist; 12.4.1 is the latest stable release
FROM nvidia/cuda:13.0.1-cudnn-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
  PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PATH="/opt/venv/bin:${PATH}"

# ── 1. System deps ────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  gnupg \
  python3 \
  python3-venv \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Ensure `python` points to python3
RUN ln -sf /usr/bin/python3 /usr/bin/python

# ── 2. Cloudflare GPG key + repo ─────────────────────────────────────────────
RUN mkdir -p -m 0755 /usr/share/keyrings && \
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null && \
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
  https://pkg.cloudflare.com/cloudflared \
  $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  | tee /etc/apt/sources.list.d/cloudflared.list

# ── 3. Install cloudflared ────────────────────────────────────────────────────
RUN apt-get update && \
  apt-get install -y --no-install-recommends cloudflared && \
  rm -rf /var/lib/apt/lists/*

# ── 4. Python virtualenv + dependencies ──────────────────────────────────────
WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN python3 -m venv /opt/venv && \
  /opt/venv/bin/pip install --upgrade pip && \
  /opt/venv/bin/pip install --no-cache-dir -r /app/requirements.txt

# ── 5. Application source ─────────────────────────────────────────────────────
# Copy both files — main.py is the FastAPI entrypoint, model.py holds ML logic
COPY api/main.py /app/main.py
COPY api/model.py /app/model.py

# ── 6. Entrypoint ────────────────────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Cloudflare tunnel handles all inbound traffic → no need to publish this port
# on the host, but EXPOSE documents what the app listens on internally.
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]