from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import get_current_user_id
from .config import settings
from .db import Database
from .schemas import (
    ChatRequest,
    ChatResponse,
    DeckCardsResponse,
    DeckGenerateRequest,
    DeckGenerateResponse,
    DecksListResponse,
    DeckOut,
    FlashcardGenerateRequest,
    FlashcardOut,
    SourceOut,
    SourcesListResponse,
    URLIngestRequest,
)
from .services.gemini_client import GeminiService
from .services.ingestion import fetch_web_document, pdf_to_chunks, url_to_chunks, url_to_name
from .services.s3_store import S3Store
from .services.supabase_store import SupabaseStore
from .services.vector_store import UserVectorStore

app = FastAPI(title="LearnBot API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://learn-bot-ai.vercel.app",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database(settings.database_path)
gemini = GeminiService()
source_store = SupabaseStore(
    url=settings.supabase_url,
    service_role_key=settings.supabase_service_role_key,
    bucket=settings.supabase_sources_bucket,
)
s3_store = S3Store(
    region=settings.aws_region,
    bucket=settings.aws_s3_bucket,
    access_key_id=settings.aws_access_key_id,
    secret_access_key=settings.aws_secret_access_key,
)
settings.data_dir.mkdir(parents=True, exist_ok=True)
logger = logging.getLogger(__name__)

if settings.dev_auth_bypass:
    logger.warning("DEV_AUTH_BYPASS is enabled. All requests are authenticated as dev-user.")


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Any, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {exc}"})


def _user_dir(user_id: str) -> Path:
    user_dir = settings.data_dir / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me")
def get_me(user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    return {"user_id": user_id}


@app.post("/api/sources/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    safe_name = Path(file.filename).name
    source_id = str(uuid4())
    s3_key = f"{user_id}/{source_id}/{safe_name}"

    source = source_store.create_source(
        source_id=source_id,
        user_id=user_id,
        name=safe_name,
        source_type="pdf",
        storage_bucket="s3",
        storage_path="pending",
    )

    file_bytes = await file.read()
    try:
        s3_store.upload_bytes(
            key=s3_key,
            content=file_bytes,
            content_type=file.content_type or "application/pdf",
        )
        source = source_store.update_source_storage(
            user_id=user_id,
            source_id=source_id,
            storage_bucket="s3",
            storage_path=s3_key,
        )
    except Exception as exc:
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {exc}") from exc

    temp_path: Path | None = None
    try:
        downloaded_bytes = s3_store.download_bytes(s3_key)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(downloaded_bytes)
            temp_path = Path(temp_file.name)
        chunks = pdf_to_chunks(temp_path)
        source_store.replace_source_chunks(
            source_id=source_id,
            user_id=user_id,
            chunks=chunks,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to extract or persist chunks for source_id=%s", source_id)
        try:
            s3_store.delete_object(s3_key)
        except Exception:
            logger.exception("Failed to clean up S3 object for source_id=%s", source_id)
        db.delete_chunks_by_source(user_id=user_id, source_id=source_id)
        source_store.delete_source_chunks(source_id=source_id, user_id=user_id)
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=500, detail="Failed to process uploaded PDF") from exc
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)

    if not chunks:
        s3_store.delete_object(s3_key)
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=400, detail="No text extracted from PDF")

    chunk_ids = db.add_chunks(user_id=user_id, source_id=source_id, chunks=chunks, source_name=safe_name)
    user_dir = _user_dir(user_id)
    vectors = gemini.embed_texts([c["content"] for c in chunks])
    UserVectorStore(user_dir).add(vectors, chunk_ids)

    return {"source": source, "chunks_indexed": len(chunks)}


@app.post("/api/sources/url")
async def ingest_url(payload: URLIngestRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    return await ingest_web(payload, user_id)


@app.post("/api/sources/web")
async def ingest_web(payload: URLIngestRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    source_id = str(uuid4())
    source_url = str(payload.url)

    try:
        source_name, _, chunks = await fetch_web_document(source_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {exc}") from exc

    source_name = source_name or url_to_name(source_url)
    source = source_store.create_web_source(
        source_id=source_id,
        user_id=user_id,
        name=source_name,
        url=source_url,
    )

    if not chunks:
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=400, detail="No text extracted from URL")

    try:
        source_store.replace_source_chunks(
            source_id=source_id,
            user_id=user_id,
            chunks=chunks,
        )
        chunk_ids = db.add_chunks(user_id=user_id, source_id=source_id, chunks=chunks, source_name=source_name)
        user_dir = _user_dir(user_id)
        vectors = gemini.embed_texts([c["content"] for c in chunks])
        UserVectorStore(user_dir).add(vectors, chunk_ids)
    except Exception as exc:
        logger.exception("Failed to process web source for source_id=%s", source_id)
        db.delete_chunks_by_source(user_id=user_id, source_id=source_id)
        source_store.delete_source_chunks(source_id=source_id, user_id=user_id)
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=500, detail="Failed to process web source") from exc

    return {"source": source, "chunk_count": len(chunks)}


@app.get("/api/sources", response_model=SourcesListResponse)
def list_sources(user_id: str = Depends(get_current_user_id)) -> dict[str, list[dict[str, Any]]]:
    return {"sources": source_store.list_sources(user_id)}


@app.delete("/api/sources/{source_id}")
def delete_source(source_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    source = source_store.get_source(user_id=user_id, source_id=source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    storage_path = source.get("storage_path")
    storage_bucket = source.get("storage_bucket")
    if storage_path and storage_bucket == "s3":
        try:
            s3_store.delete_object(storage_path)
        except Exception:
            logger.exception("Failed to delete storage object for source_id=%s", source_id)

    chunk_ids = db.list_chunk_ids_for_source(user_id=user_id, source_id=source_id)
    # TODO: remove vectors for deleted chunk IDs once UserVectorStore supports deletion/rebuild.
    _ = chunk_ids

    db.delete_chunks_by_source(user_id=user_id, source_id=source_id)
    source_store.delete_source_chunks(source_id=source_id, user_id=user_id)
    source_store.soft_delete_source(user_id=user_id, source_id=source_id)

    return {"deleted": True, "source_id": source_id}


@app.post("/api/decks/generate", response_model=DeckGenerateResponse)
def generate_deck(payload: DeckGenerateRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    difficulty = payload.difficulty.lower()
    if difficulty not in {"easy", "mixed", "hard"}:
        raise HTTPException(status_code=400, detail="difficulty must be easy, mixed, or hard")

    source = source_store.get_source(user_id=user_id, source_id=payload.source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    supabase_chunks = source_store.list_source_chunks(
        source_id=payload.source_id,
        user_id=user_id,
        limit=20,
    )

    source_text_parts: list[str] = []
    total_chars = 0
    if supabase_chunks:
        for chunk in supabase_chunks:
            content = str(chunk.get("content") or "").strip()
            if not content:
                continue
            remaining = 15000 - total_chars
            if remaining <= 0:
                break
            source_text_parts.append(content[:remaining])
            total_chars += min(len(content), remaining)

    if not source_text_parts:
        chunks = db.list_chunks_by_source(user_id=user_id, source_id=payload.source_id, limit=20)
        for chunk in chunks:
            content = str(chunk.get("content") or "").strip()
            if not content:
                continue
            remaining = 15000 - total_chars
            if remaining <= 0:
                break
            source_text_parts.append(content[:remaining])
            total_chars += min(len(content), remaining)

    if not source_text_parts:
        raise HTTPException(status_code=400, detail="No extracted content found for source")

    source_text = "\n\n".join(source_text_parts).strip()
    if not source_text:
        raise HTTPException(status_code=400, detail="Source has no usable text")

    cards = gemini.generate_flashcards(
        source_name=source["name"],
        source_text=source_text,
        num_cards=payload.num_cards,
        difficulty=difficulty,
    )

    deck_name = payload.deck_name.strip() if payload.deck_name else f"{source['name']} Deck"
    deck = source_store.create_deck(
        user_id=user_id,
        source_id=payload.source_id,
        name=deck_name,
    )
    inserted_cards = source_store.insert_flashcards(deck["id"], cards)
    return {"deck_id": deck["id"], "count": len(inserted_cards)}


@app.get("/api/decks", response_model=DecksListResponse)
def list_decks(user_id: str = Depends(get_current_user_id)) -> dict[str, list[dict[str, Any]]]:
    return {"decks": source_store.list_decks(user_id)}


@app.get("/api/decks/{deck_id}/cards", response_model=DeckCardsResponse)
def get_deck_cards(
    deck_id: str,
    page: int = 1,
    page_size: int = 9,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    if page < 1 or page_size < 1:
        raise HTTPException(status_code=400, detail="page and page_size must be positive")

    deck = source_store.get_deck(user_id=user_id, deck_id=deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    total, cards = source_store.get_deck_cards(deck_id=deck_id, page=page, page_size=page_size)
    deck_payload = {
        "id": deck["id"],
        "name": deck["name"],
        "source_id": deck.get("source_id"),
        "source_title": deck.get("source_title"),
        "card_count": total,
        "created_at": deck["created_at"],
    }
    return {
        "deck": deck_payload,
        "page": page,
        "page_size": page_size,
        "total": total,
        "cards": cards,
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    user_dir = _user_dir(user_id)
    store = UserVectorStore(user_dir)

    q_vec = gemini.embed_texts([payload.question])
    chunk_ids = store.search(q_vec, k=8)
    chunks = db.get_chunks(user_id, chunk_ids)

    if payload.sourceIds:
        allowed = set(payload.sourceIds)
        chunks = [c for c in chunks if c["source_id"] in allowed]

    if not chunks:
        raise HTTPException(status_code=404, detail="No relevant context found. Upload sources first.")

    citations: list[dict[str, Any]] = []
    context_blocks: list[str] = []
    for i, chunk in enumerate(chunks[:6], start=1):
        citations.append(
            {
                "source_id": chunk["source_id"],
                "source_name": chunk["source_name"],
                "snippet": chunk["snippet"],
                "page": chunk["page"],
            }
        )
        page_label = f"p.{chunk['page']}" if chunk["page"] else "web"
        context_blocks.append(
            f"[{i}] ({chunk['source_name']} - {page_label})\n{chunk['content']}"
        )

    prompt = (
        "You are LearnBot. Use only the provided context. "
        "If the context is insufficient, say so clearly.\n\n"
        f"Question: {payload.question}\n\n"
        f"Context:\n{'\n\n'.join(context_blocks)}\n\n"
        "Return a concise answer."
    )

    answer = gemini.generate_answer(prompt)
    answer_id = db.save_answer(user_id=user_id, question=payload.question, answer=answer, citations=citations)
    return {"answer_id": answer_id, "answer": answer, "citations": citations}


@app.post("/api/flashcards/generate", response_model=FlashcardOut)
def generate_flashcard(
    payload: FlashcardGenerateRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    answer_id = payload.answerId
    question = payload.question
    answer = payload.answer

    if answer_id:
        answer_record = db.get_answer(user_id, answer_id)
        if not answer_record:
            raise HTTPException(status_code=404, detail="answerId not found")
        question = answer_record["question"]
        answer = answer_record["answer"]

    if not question or not answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide answerId or both question and answer",
        )

    generated = gemini.generate_flashcard(question=question, answer=answer)
    flashcard = db.create_flashcard(
        user_id=user_id,
        question=generated["question"],
        answer=generated["answer"],
        answer_id=answer_id,
    )
    return flashcard


@app.get("/api/flashcards", response_model=list[FlashcardOut])
def list_flashcards(user_id: str = Depends(get_current_user_id)) -> list[dict[str, Any]]:
    return db.list_flashcards(user_id)
