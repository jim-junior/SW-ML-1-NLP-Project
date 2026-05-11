"""
prebuild.py — Run once at Docker build time (NOT at runtime).

What it does:
  1. Downloads the COCIS dataset from HuggingFace
  2. Encodes all chunks with SentenceTransformer
  3. Saves the FAISS index to   /app/data/faiss.index
  4. Saves the raw chunks to    /app/data/chunks.json
  5. Pre-downloads (caches) all HuggingFace model weights so the
     container starts with zero network I/O at runtime.

This script is called once inside `docker build` and its output is baked
into the image layer. The running container never touches HuggingFace.
"""

import json
import os
import logging

import faiss
import numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    AutoModelForSeq2SeqLM,
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("prebuild")

DATA_DIR = "/app/data"
FAISS_PATH = f"{DATA_DIR}/faiss.index"
CHUNKS_PATH = f"{DATA_DIR}/chunks.json"

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
LLM_MODEL_NAME = "microsoft/Phi-4-mini-instruct"
TRANSLATE_MODEL_NAME = "facebook/nllb-200-distilled-600M"
DATASET_NAME = "jimjunior/cocis-web-info"

os.makedirs(DATA_DIR, exist_ok=True)


# ── 1. Dataset ────────────────────────────────────────────────────────────────
log.info(f"Downloading dataset: {DATASET_NAME}")
dataset = load_dataset(DATASET_NAME)
chunks = [row["text"] for row in dataset["train"]]
log.info(f"Downloaded {len(chunks)} chunks.")

with open(CHUNKS_PATH, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False)
log.info(f"Chunks saved to {CHUNKS_PATH}")


# ── 2. Embeddings + FAISS index ───────────────────────────────────────────────
log.info(f"Loading embedding model: {EMBED_MODEL_NAME}")
embed_model = SentenceTransformer(EMBED_MODEL_NAME)
# model weights are now cached in HF_HOME — no download at runtime

log.info("Encoding chunks (this may take a few minutes)...")
embeddings = embed_model.encode(chunks, show_progress_bar=True, batch_size=64)

dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(np.array(embeddings, dtype=np.float32))
faiss.write_index(index, FAISS_PATH)
log.info(
    f"FAISS index ({index.ntotal} vectors, dim={dimension}) saved to {FAISS_PATH}")


# ── 3. Pre-cache LLM weights ──────────────────────────────────────────────────
# We only download (cache) the weights here — we do NOT load them into GPU RAM
# because the build machine likely has no GPU. model.py loads them at runtime.
log.info(f"Pre-caching LLM tokenizer + weights: {LLM_MODEL_NAME}")
AutoTokenizer.from_pretrained(LLM_MODEL_NAME)
# Use cpu + float32 just to trigger the weight download; runtime will use float16 + GPU
AutoModelForCausalLM.from_pretrained(
    LLM_MODEL_NAME, torch_dtype="auto", device_map="cpu")
log.info("LLM weights cached.")


# ── 4. Pre-cache translation model weights ────────────────────────────────────
log.info(f"Pre-caching translation model: {TRANSLATE_MODEL_NAME}")
AutoTokenizer.from_pretrained(TRANSLATE_MODEL_NAME)
AutoModelForSeq2SeqLM.from_pretrained(TRANSLATE_MODEL_NAME)
log.info("Translation model weights cached.")


log.info("=" * 60)
log.info("prebuild.py complete. Image is ready for zero-download startup.")
log.info("=" * 60)
