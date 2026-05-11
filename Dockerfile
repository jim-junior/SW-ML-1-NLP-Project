

FROM nvidia/cuda:13.0.1-cudnn-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
  PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PATH="/opt/venv/bin:${PATH}" \
  # Cloud Run injects PORT at runtime (default 8080).
  # We set a fallback here so local `docker run` works without -e PORT.
  PORT=8080


RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  gnupg \
  python3 \
  python3-venv \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*


RUN ln -sf /usr/bin/python3 /usr/bin/python


WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN python3 -m venv /opt/venv && \
  /opt/venv/bin/pip install --upgrade pip && \
  /opt/venv/bin/pip install --no-cache-dir -r /app/requirements.txt


COPY api/main.py /app/main.py
COPY api/model.py /app/model.py
COPY prebuild.py  /app/prebuild.py

# ── 4. Bake data into the image at build time ─────────────────────────────────
#
#   prebuild.py does the following (once, during `docker build`):
#     • Downloads the HuggingFace dataset → /app/data/chunks.json
#     • Computes SentenceTransformer embeddings → /app/data/faiss.index
#     • Downloads + caches all model weights → /app/.cache/huggingface
#
#   The running container loads everything from local disk.
#   Cold start no longer downloads anything from the network.
#
RUN python /app/prebuild.py

# ── 5. Cloud Run expects the container to listen on $PORT ─────────────────────
EXPOSE 8080

# exec form → uvicorn is PID 1 and receives SIGTERM from Cloud Run gracefully
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]