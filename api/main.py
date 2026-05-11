"""
COCIS Voice Assistant - FastAPI Application
Multilingual RAG-based Q&A API supporting English, Luganda, and Acholi
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
from typing import Literal
import logging
import time

from model import COCISAssistant

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("cocis-api")


# ─── Lifespan (load models once on startup) ─────────────────────────────────
assistant: COCISAssistant | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global assistant
    logger.info("🚀 Loading COCIS Assistant models...")
    assistant = COCISAssistant()
    logger.info("✅ Models loaded successfully.")
    yield
    logger.info("🛑 Shutting down COCIS Assistant.")
    assistant = None


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="COCIS Voice Assistant API",
    description=(
        "A multilingual Retrieval-Augmented Generation (RAG) API for the "
        "College of Computing and Information Sciences (COCIS). "
        "Supports English, Luganda, and Acholi."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Schemas ─────────────────────────────────────────────────────────────────
SUPPORTED_LANGUAGES = Literal["english", "luganda", "acholi"]


class AskRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The question to ask the COCIS assistant.",
        examples=["COCIS kye ki?", "What programs does COCIS offer?"],
    )
    language: SUPPORTED_LANGUAGES = Field(
        default="english",
        description="Language of the question. Supported: english, luganda, acholi.",
    )


class AskResponse(BaseModel):
    question: str = Field(...,
                          description="The original question as received.")
    language: str = Field(..., description="Detected/requested language.")
    answer: str = Field(...,
                        description="The generated answer in the requested language.")
    english_question: str = Field(
        ..., description="Question translated to English (for transparency).")
    english_answer: str = Field(...,
                                description="Raw English answer before translation.")
    latency_seconds: float = Field(...,
                                   description="Total processing time in seconds.")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    supported_languages: list[str]


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "COCIS Voice Assistant API is running.",
        "docs": "/docs",
        "health": "/health",
        "ask": "/ask",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return HealthResponse(
        status="ok" if assistant is not None else "loading",
        model_loaded=assistant is not None,
        supported_languages=["english", "luganda", "acholi"],
    )


@app.post("/ask", response_model=AskResponse, tags=["Assistant"])
async def ask(body: AskRequest):
    """
    Ask the COCIS Assistant a question in any supported language.

    - **question**: Your question (up to 1000 characters).
    - **language**: `english` | `luganda` | `acholi` (default: `english`).

    The API will:
    1. Translate the question to English if needed.
    2. Retrieve relevant context from the COCIS knowledge base.
    3. Generate an answer using the language model.
    4. Translate the answer back to your language.
    """
    if assistant is None:
        raise HTTPException(
            status_code=503, detail="Models are still loading. Please retry shortly.")

    logger.info(f"[/ask] lang={body.language!r} question={body.question!r}")
    start = time.perf_counter()

    try:
        result = assistant.multilingual_chat(body.question, body.language)
    except Exception as exc:
        logger.exception("Error during multilingual_chat")
        raise HTTPException(
            status_code=500, detail=f"Internal model error: {str(exc)}")

    latency = round(time.perf_counter() - start, 3)
    logger.info(f"[/ask] completed in {latency}s")

    return AskResponse(
        question=body.question,
        language=body.language,
        answer=result["final_answer"],
        english_question=result["english_question"],
        english_answer=result["english_answer"],
        latency_seconds=latency,
    )
