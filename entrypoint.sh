#!/bin/bash
set -euo pipefail

# ─── Helpers ──────────────────────────────────────────────────────────────────
log() { echo "[entrypoint] $(date '+%H:%M:%S') $*"; }
die() { echo "[entrypoint] ERROR: $*" >&2; exit 1; }

# ─── Guard: TUNNEL_TOKEN must be set ─────────────────────────────────────────
if [[ -z "${TUNNEL_TOKEN:-}" ]]; then
  die "TUNNEL_TOKEN environment variable is not set. Pass it with -e TUNNEL_TOKEN=<your_token>"
fi

# ─── Start FastAPI (uvicorn) ──────────────────────────────────────────────────
log "Starting FastAPI on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 &
UVICORN_PID=$!
log "FastAPI PID: $UVICORN_PID"

# ─── Wait for FastAPI to be ready before opening the tunnel ──────────────────
log "Waiting for FastAPI to become ready..."
MAX_WAIT=60
ELAPSED=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
  if (( ELAPSED >= MAX_WAIT )); then
    die "FastAPI did not become ready within ${MAX_WAIT}s"
  fi
  sleep 2
  (( ELAPSED += 2 ))
done
log "FastAPI is ready after ${ELAPSED}s."

# ─── Start Cloudflare Tunnel ──────────────────────────────────────────────────
log "Starting Cloudflare Tunnel..."
cloudflared tunnel --no-autoupdate run --token "${TUNNEL_TOKEN}" &
CLOUDFLARED_PID=$!
log "cloudflared PID: $CLOUDFLARED_PID"

# ─── Monitor both processes ───────────────────────────────────────────────────
# If either process dies unexpectedly, shut the container down so Docker /
# the orchestrator can restart it cleanly.
log "Both services running. Monitoring..."

while true; do
  # Check uvicorn
  if ! kill -0 "$UVICORN_PID" 2>/dev/null; then
    die "uvicorn (PID $UVICORN_PID) exited unexpectedly. Shutting down container."
  fi
  # Check cloudflared
  if ! kill -0 "$CLOUDFLARED_PID" 2>/dev/null; then
    die "cloudflared (PID $CLOUDFLARED_PID) exited unexpectedly. Shutting down container."
  fi
  sleep 5
done