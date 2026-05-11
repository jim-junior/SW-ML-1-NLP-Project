import os
import re
import time
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from readability import Document

# ==============================
# CONFIG
# ==============================

BASE_URL = "https://cocis.mak.ac.ug"
MAX_PAGES = 50
DELAY = 2  # seconds between requests

OUTPUT_DIR = "./data"

# ==============================
# SETUP DIRECTORIES
# ==============================

RAW_DIR = os.path.join(OUTPUT_DIR, "raw")
CLEAN_DIR = os.path.join(OUTPUT_DIR, "cleaned")
CHUNK_DIR = os.path.join(OUTPUT_DIR, "chunks")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(CLEAN_DIR, exist_ok=True)
os.makedirs(CHUNK_DIR, exist_ok=True)

# ==============================
# UTIL FUNCTIONS
# ==============================


def clean_text(text):
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^a-zA-Z0-9.,!?()\- ]', '', text)
    return text.strip()


def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        if len(chunk) > 100:
            chunks.append(chunk)

        start += (chunk_size - overlap)

    return chunks


def save_text(file_path, content):
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)


def save_json(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def is_valid_url(url, base_domain):
    parsed = urlparse(url)
    return parsed.netloc == base_domain

# ==============================
# CONTENT EXTRACTION
# ==============================


def extract_main_content(html):
    try:
        doc = Document(html)
        summary_html = doc.summary()
        soup = BeautifulSoup(summary_html, "html.parser")
        return soup.get_text(separator=" ", strip=True)
    except:
        return ""

# ==============================
# CRAWLER
# ==============================


def crawl(base_url):
    visited = set()
    queue = [base_url]

    base_domain = urlparse(base_url).netloc
    page_count = 0

    all_chunks = []

    while queue and page_count < MAX_PAGES:
        url = queue.pop(0)

        if url in visited:
            continue

        print(f"[{page_count+1}] Crawling: {url}")

        try:
            response = requests.get(url, timeout=10)
            html = response.text

            visited.add(url)
            page_count += 1

            # ======================
            # Extract readable content
            # ======================
            raw_text = extract_main_content(html)

            if not raw_text or len(raw_text) < 200:
                continue

            # Save raw
            raw_path = os.path.join(RAW_DIR, f"page_{page_count}.txt")
            save_text(raw_path, raw_text)

            # ======================
            # Clean text
            # ======================
            cleaned = clean_text(raw_text)

            clean_path = os.path.join(CLEAN_DIR, f"page_{page_count}.txt")
            save_text(clean_path, cleaned)

            # ======================
            # Chunk text
            # ======================
            chunks = chunk_text(cleaned)

            for i, chunk in enumerate(chunks):
                chunk_data = {
                    "source_url": url,
                    "chunk_id": f"{page_count}_{i}",
                    "text": chunk
                }

                chunk_path = os.path.join(
                    CHUNK_DIR,
                    f"chunk_{page_count}_{i}.json"
                )

                save_json(chunk_path, chunk_data)

                all_chunks.append(chunk_data)

            # ======================
            # Find new links
            # ======================
            soup = BeautifulSoup(html, "html.parser")

            for link in soup.find_all("a", href=True):
                full_url = urljoin(url, link["href"])

                if is_valid_url(full_url, base_domain):
                    if full_url not in visited:
                        queue.append(full_url)

            time.sleep(DELAY)

        except Exception as e:
            print(f"Error crawling {url}: {e}")

    print("\n✅ Crawling complete!")
    print(f"Pages processed: {page_count}")
    print(f"Total chunks: {len(all_chunks)}")

    # Save all chunks combined (optional)
    save_json(os.path.join(OUTPUT_DIR, "all_chunks.json"), all_chunks)


# ==============================
# RUN
# ==============================

if __name__ == "__main__":
    crawl(BASE_URL)
