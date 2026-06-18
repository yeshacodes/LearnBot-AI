from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

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
    QuizGenerateRequest,
    QuizGenerateResponse,
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
logging.basicConfig(level=logging.INFO)

if settings.dev_auth_bypass:
    logger.warning("DEV_AUTH_BYPASS is enabled. All requests are authenticated as dev-user.")


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Any, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {exc}"})


def _user_dir(user_id: str) -> Path:
    user_dir = settings.data_dir / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _require_valid_source_id(source_id: str) -> str:
    try:
        UUID(source_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid source id") from exc
    return source_id


def _source_debug_payload(user_id: str, source_id: str) -> dict[str, Any]:
    source_id = _require_valid_source_id(source_id)
    source = source_store.get_source(user_id=user_id, source_id=source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    db_chunks = db.list_chunks_by_source(user_id=user_id, source_id=source_id)
    supabase_chunks = source_store.list_source_chunks(source_id=source_id, user_id=user_id)
    content_parts = [str(chunk.get("content") or "") for chunk in db_chunks]
    extracted_text_length = sum(len(part) for part in content_parts)
    chunk_count = len(db_chunks)
    status_value = "ready" if chunk_count > 0 and extracted_text_length > 0 else "failed"
    return {
        "source_id": source_id,
        "filename": source.get("name") or "Untitled",
        "status": status_value,
        "extracted_text_length": extracted_text_length,
        "chunk_count": chunk_count,
        "source_chunk_count": len(supabase_chunks),
    }


def _collect_source_text(user_id: str, source_ids: list[str], *, max_chars: int = 24000) -> tuple[str, list[dict[str, Any]]]:
    source_text_parts: list[str] = []
    sources: list[dict[str, Any]] = []
    total_chars = 0

    for source_id in source_ids:
        source_id = _require_valid_source_id(source_id)
        source = source_store.get_source(user_id=user_id, source_id=source_id)
        if source is None:
            raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")
        sources.append(source)

        chunks = source_store.list_source_chunks(source_id=source_id, user_id=user_id, limit=24)
        if not chunks:
            chunks = db.list_chunks_by_source(user_id=user_id, source_id=source_id, limit=24)

        chunk_count = len(chunks)
        logger.info("Collect source text user_id=%s source_id=%s chunk_count=%s", user_id, source_id, chunk_count)
        if chunk_count == 0:
            raise HTTPException(
                status_code=400,
                detail="This source has not been processed yet or contains no readable text.",
            )

        for chunk in chunks:
            content = str(chunk.get("content") or "").strip()
            if not content:
                continue
            remaining = max_chars - total_chars
            if remaining <= 0:
                break
            source_text_parts.append(f"Source: {source.get('name')}\n{content[:remaining]}")
            total_chars += min(len(content), remaining)
        if total_chars >= max_chars:
            break

    source_text = "\n\n".join(source_text_parts).strip()
    if not source_text:
        raise HTTPException(status_code=400, detail="Selected sources have no usable extracted text.")
    return source_text, sources


def _format_chat_history(messages: list[Any] | None, current_question: str, *, limit: int = 8) -> str:
    if not messages:
        return "No previous conversation."

    normalized: list[str] = []
    for message in messages[-limit:]:
        role = str(getattr(message, "role", "") or "").strip().lower()
        content = str(getattr(message, "content", "") or "").strip()
        if not content:
            continue
        if role == "user" and content == current_question:
            continue
        speaker = "Student" if role == "user" else "LearnBot"
        normalized.append(f"{speaker}: {content[:900]}")

    return "\n".join(normalized) if normalized else "No previous conversation."


def _dedupe_chunks(chunks: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for chunk in chunks:
        chunk_id = str(chunk.get("id") or "")
        key = chunk_id or f"{chunk.get('source_id')}:{chunk.get('page')}:{chunk.get('snippet')}"
        if key in seen:
            continue
        seen.add(key)
        result.append(chunk)
        if len(result) >= limit:
            break
    return result


def _add_neighbor_chunks(user_id: str, chunks: list[dict[str, Any]], source_ids: list[str] | None, *, limit: int = 10) -> list[dict[str, Any]]:
    if not chunks:
        return []

    selected_sources = set(source_ids or [str(chunk.get("source_id")) for chunk in chunks if chunk.get("source_id")])
    expanded: list[dict[str, Any]] = []
    by_source = {source_id: db.list_chunks_by_source(user_id=user_id, source_id=source_id) for source_id in selected_sources}

    for chunk in chunks:
        source_chunks = by_source.get(str(chunk.get("source_id"))) or []
        chunk_id = str(chunk.get("id") or "")
        index = next((i for i, item in enumerate(source_chunks) if str(item.get("id")) == chunk_id), -1)
        if index < 0:
            expanded.append(chunk)
            continue
        for neighbor_index in (index - 1, index, index + 1):
            if 0 <= neighbor_index < len(source_chunks):
                expanded.append(source_chunks[neighbor_index])

    return _dedupe_chunks(expanded, limit=limit)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
def api_health() -> dict[str, Any]:
    routes = sorted(
        {
            f"{','.join(sorted(route.methods or []))} {route.path}"
            for route in app.routes
            if getattr(route, "path", "").startswith("/api/")
        }
    )
    return {"status": "ok", "routes": routes}


@app.get("/me")
def get_me(user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    return {"user_id": user_id}


async def _upload_pdf_impl(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    safe_name = Path(file.filename).name
    source_id = str(uuid4())
    s3_key = f"{user_id}/{source_id}/{safe_name}"
    logger.info("PDF upload started user_id=%s source_id=%s filename=%s", user_id, source_id, safe_name)

    source = source_store.create_source(
        source_id=source_id,
        user_id=user_id,
        name=safe_name,
        source_type="pdf",
        storage_bucket="s3",
        storage_path="pending",
    )

    file_bytes = await file.read()
    logger.info("PDF upload read bytes user_id=%s source_id=%s bytes=%s", user_id, source_id, len(file_bytes))
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
        extracted_text_length = sum(len(str(chunk.get("content") or "")) for chunk in chunks)
        logger.info(
            "PDF extraction complete user_id=%s source_id=%s filename=%s chunk_count=%s extracted_text_length=%s",
            user_id,
            source_id,
            safe_name,
            len(chunks),
            extracted_text_length,
        )
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
        logger.warning("PDF extraction found no readable text user_id=%s source_id=%s filename=%s", user_id, source_id, safe_name)
        s3_store.delete_object(s3_key)
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=400, detail="No text extracted from PDF")

    chunk_ids = db.add_chunks(user_id=user_id, source_id=source_id, chunks=chunks, source_name=safe_name)
    logger.info("PDF chunks stored user_id=%s source_id=%s sqlite_chunk_count=%s", user_id, source_id, len(chunk_ids))
    user_dir = _user_dir(user_id)
    vectors = gemini.embed_texts([c["content"] for c in chunks])
    UserVectorStore(user_dir).add(vectors, chunk_ids)
    logger.info("PDF vectors indexed user_id=%s source_id=%s vector_count=%s", user_id, source_id, len(chunk_ids))

    return {
        "source": {
            **source,
            "status": "ready",
            "chunk_count": len(chunks),
            "extracted_text_length": sum(len(str(chunk.get("content") or "")) for chunk in chunks),
        },
        "source_id": source_id,
        "chunk_count": len(chunks),
        "chunks_indexed": len(chunks),
        "extracted_text_length": sum(len(str(chunk.get("content") or "")) for chunk in chunks),
    }


@app.post("/api/sources/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    return await _upload_pdf_impl(file=file, user_id=user_id)


@app.post("/api/sources/web")
async def ingest_web(payload: URLIngestRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    source_id = str(uuid4())
    source_url = str(payload.url)

    try:
        source_name, _, chunks = await fetch_web_document(source_url)
        logger.info("Web extraction complete user_id=%s source_id=%s url=%s chunk_count=%s", user_id, source_id, source_url, len(chunks))
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
        logger.warning("Web extraction found no readable text user_id=%s source_id=%s url=%s", user_id, source_id, source_url)
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=400, detail="No text extracted from URL")

    try:
        source_store.replace_source_chunks(
            source_id=source_id,
            user_id=user_id,
            chunks=chunks,
        )
        chunk_ids = db.add_chunks(user_id=user_id, source_id=source_id, chunks=chunks, source_name=source_name)
        logger.info("Web chunks stored user_id=%s source_id=%s sqlite_chunk_count=%s", user_id, source_id, len(chunk_ids))
        user_dir = _user_dir(user_id)
        vectors = gemini.embed_texts([c["content"] for c in chunks])
        UserVectorStore(user_dir).add(vectors, chunk_ids)
        logger.info("Web vectors indexed user_id=%s source_id=%s vector_count=%s", user_id, source_id, len(chunk_ids))
    except Exception as exc:
        logger.exception("Failed to process web source for source_id=%s", source_id)
        db.delete_chunks_by_source(user_id=user_id, source_id=source_id)
        source_store.delete_source_chunks(source_id=source_id, user_id=user_id)
        source_store.soft_delete_source(user_id=user_id, source_id=source_id)
        raise HTTPException(status_code=500, detail="Failed to process web source") from exc

    return {
        "source": {
            **source,
            "status": "ready",
            "chunk_count": len(chunks),
            "extracted_text_length": sum(len(str(chunk.get("content") or "")) for chunk in chunks),
        },
        "source_id": source_id,
        "chunk_count": len(chunks),
        "extracted_text_length": sum(len(str(chunk.get("content") or "")) for chunk in chunks),
    }


@app.get("/api/sources", response_model=SourcesListResponse)
def list_sources(user_id: str = Depends(get_current_user_id)) -> dict[str, list[dict[str, Any]]]:
    sources = []
    for source in source_store.list_sources(user_id):
        try:
            debug = _source_debug_payload(user_id=user_id, source_id=source["id"])
            sources.append({**source, **debug, "id": source["id"], "name": source.get("name")})
        except Exception:
            sources.append({**source, "status": "processing", "chunk_count": 0, "extracted_text_length": 0})
    return {"sources": sources}


@app.get("/api/sources/{source_id}")
def get_source(source_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    source_id = _require_valid_source_id(source_id)
    source = source_store.get_source(user_id=user_id, source_id=source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    debug = _source_debug_payload(user_id=user_id, source_id=source_id)
    return {**source, **debug, "id": source["id"], "name": source.get("name")}


@app.get("/api/sources/{source_id}/debug")
def get_source_debug(source_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    source_id = _require_valid_source_id(source_id)
    payload = _source_debug_payload(user_id=user_id, source_id=source_id)
    logger.info(
        "Source debug user_id=%s source_id=%s status=%s chunk_count=%s extracted_text_length=%s",
        user_id,
        source_id,
        payload["status"],
        payload["chunk_count"],
        payload["extracted_text_length"],
    )
    return payload


@app.delete("/api/sources/{source_id}")
def delete_source(source_id: str, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    source_id = _require_valid_source_id(source_id)
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

    source_text, sources = _collect_source_text(user_id, [payload.source_id], max_chars=24000)
    source = sources[0]

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
    response_cards = []
    for index, inserted in enumerate(inserted_cards):
        generated = cards[index] if index < len(cards) else {}
        response_cards.append(
            {
                "id": inserted["id"],
                "deck_id": deck["id"],
                "source_id": payload.source_id,
                "question": inserted.get("question") or generated.get("question", ""),
                "answer": inserted.get("answer") or generated.get("answer", ""),
                "tags": [
                    str(tag)
                    for tag in (generated.get("tags") or inserted.get("tags") or [])
                    if str(tag).strip() and not str(tag).startswith(("topic:", "difficulty:", "excerpt:"))
                ],
                "topic": generated.get("topic"),
                "difficulty": generated.get("difficulty"),
                "source_excerpt": generated.get("source_excerpt"),
            }
        )

    deck_payload = {
        "id": deck["id"],
        "name": deck["name"],
        "source_id": payload.source_id,
        "source_title": source.get("name"),
        "card_count": len(response_cards),
        "created_at": deck["created_at"],
    }
    return {"deck_id": deck["id"], "count": len(response_cards), "deck": deck_payload, "cards": response_cards}


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

    total, cards = source_store.get_deck_cards(user_id=user_id, deck_id=deck_id, page=page, page_size=page_size)
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


@app.post("/api/quizzes/generate", response_model=QuizGenerateResponse)
def generate_quiz(payload: QuizGenerateRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    difficulty = payload.difficulty.lower()
    if difficulty not in {"easy", "medium", "hard", "mixed"}:
        raise HTTPException(status_code=400, detail="difficulty must be easy, medium, hard, or mixed")

    unique_source_ids = list(dict.fromkeys(payload.source_ids))
    source_text, sources = _collect_source_text(user_id, unique_source_ids, max_chars=26000)
    source_name = ", ".join(str(source.get("name") or "Source") for source in sources)
    logger.info(
        "Quiz generation started user_id=%s source_ids=%s question_count=%s difficulty=%s text_len=%s",
        user_id,
        unique_source_ids,
        payload.question_count,
        difficulty,
        len(source_text),
    )
    questions = gemini.generate_quiz(
        source_name=source_name,
        source_text=source_text,
        question_count=payload.question_count,
        difficulty=difficulty,
    )
    quiz_id = str(uuid4())
    response_questions = [
        {
            "id": str(uuid4()),
            "question": question["question"],
            "choices": question["choices"],
            "correct_answer": question["correct_answer"],
            "explanation": question["explanation"],
            "topic": question["topic"],
            "difficulty": question["difficulty"],
            "source_excerpt": question["source_excerpt"],
            "source_id": unique_source_ids[0] if len(unique_source_ids) == 1 else None,
        }
        for question in questions
    ]
    logger.info("Quiz generation complete user_id=%s quiz_id=%s question_count=%s", user_id, quiz_id, len(response_questions))
    return {"quiz_id": quiz_id, "source_ids": unique_source_ids, "questions": response_questions}


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    user_dir = _user_dir(user_id)
    store = UserVectorStore(user_dir)

    logger.info(
        "Chat request user_id=%s source_ids=%s question_len=%s history_messages=%s",
        user_id,
        payload.sourceIds or [],
        len(payload.question),
        len(payload.messages or []),
    )
    if payload.sourceIds:
        selected_chunk_count = sum(
            len(db.list_chunks_by_source(user_id=user_id, source_id=source_id))
            for source_id in payload.sourceIds
        )
        logger.info("Chat selected source chunk count user_id=%s source_ids=%s chunk_count=%s", user_id, payload.sourceIds, selected_chunk_count)
        if selected_chunk_count == 0:
            raise HTTPException(
                status_code=400,
                detail="This source has not been processed yet or contains no readable text.",
            )

    q_vec = gemini.embed_texts([payload.question])
    chunk_ids = store.search(q_vec, k=50)
    logger.info("Chat vector search user_id=%s returned_chunk_ids=%s", user_id, len(chunk_ids))
    chunks = db.get_chunks(user_id, chunk_ids)
    logger.info("Chat db chunks loaded user_id=%s chunk_count=%s", user_id, len(chunks))

    if payload.sourceIds:
        allowed = set(payload.sourceIds)
        chunks = [c for c in chunks if c["source_id"] in allowed]
        logger.info("Chat chunks after source filter user_id=%s source_ids=%s chunk_count=%s", user_id, payload.sourceIds, len(chunks))
        if len(chunks) < 6:
            wider_chunk_ids = store.search(q_vec, k=100)
            wider_chunks = [c for c in db.get_chunks(user_id, wider_chunk_ids) if c["source_id"] in allowed]
            chunks = _dedupe_chunks([*chunks, *wider_chunks], limit=12)
            logger.info("Chat wider vector search user_id=%s source_ids=%s chunk_count=%s", user_id, payload.sourceIds, len(chunks))
        if not chunks:
            fallback_chunks: list[dict[str, Any]] = []
            for source_id in payload.sourceIds:
                fallback_chunks.extend(db.list_chunks_by_source(user_id=user_id, source_id=source_id, limit=10))
            chunks = fallback_chunks[:10]
            logger.info("Chat fallback source chunks user_id=%s source_ids=%s chunk_count=%s", user_id, payload.sourceIds, len(chunks))

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="No relevant context was found in the selected source. Try a broader question or re-upload the document.",
        )

    chunks = _add_neighbor_chunks(user_id, chunks, payload.sourceIds, limit=10)
    context_char_count = sum(len(str(chunk.get("content") or "")) for chunk in chunks)
    context_is_thin = len(chunks) < 3 or context_char_count < 1200
    logger.info(
        "Chat context assembled user_id=%s chunk_count=%s context_chars=%s context_is_thin=%s",
        user_id,
        len(chunks),
        context_char_count,
        context_is_thin,
    )

    citations: list[dict[str, Any]] = []
    context_blocks: list[str] = []
    for i, chunk in enumerate(chunks[:8], start=1):
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

    conversation_history = _format_chat_history(payload.messages, payload.question)
    context_note = (
        "The retrieved notes look thin or fragmentary. If they only contain headings, examples, or partial text, briefly say that and then teach the concept using reliable general knowledge."
        if context_is_thin
        else "The retrieved notes are substantial. Ground the explanation primarily in them."
    )
    prompt = (
        "You are LearnBot, a warm study coach and smart teaching assistant. "
        "Your job is to help the student understand and remember the material, not to report retrieval failures.\n\n"
        "Priority order:\n"
        "1. Use the retrieved source notes as grounding.\n"
        "2. Use the conversation history to understand follow-up questions like 'give me an example' or 'explain in detail'.\n"
        "3. When the notes are incomplete, supplement with your general knowledge and clearly separate it from what the notes directly say.\n\n"
        "Behavior rules:\n"
        "- Never stop with phrases like 'the context does not contain enough information' or 'I cannot explain further'.\n"
        "- If the source page only lists titles, terms, or examples, say that once in a friendly way, then teach the concepts.\n"
        "- Treat follow-up actions as continuations of the same conversation; do not restart with another retrieval limitation.\n"
        "- Sound like a tutor: conversational, example-driven, encouraging, and concrete.\n"
        "- Avoid filler like 'Alright, let's break down', 'the provided context says', 'as an AI', or robotic caveats.\n"
        "- Prefer direct teaching lines like 'Think of it this way...' or 'This matters because...'.\n"
        "- Use citations only for ideas supported by the retrieved notes. Do not invent citations for general background knowledge.\n\n"
        "Formatting rules:\n"
        "- Write plain study notes, not markdown-heavy output.\n"
        "- Do not use markdown heading markers like #, ##, or ###.\n"
        "- Use flexible sections only when they fit: Title, short explanation, Why it matters, Example, From your notes, Try this.\n"
        "- Do not force everything into bullets. Use paragraphs for explanations.\n"
        "- If the student asks for an example, always include a concrete example. For technical topics, include a simple step-by-step or small text/number diagram.\n"
        "- If you include a source note, write it naturally as 'Your notes mention...' rather than 'The provided context says...'.\n\n"
        f"Context quality note: {context_note}\n\n"
        f"Conversation so far:\n{conversation_history}\n\n"
        f"Question: {payload.question}\n\n"
        f"Context:\n{'\n\n'.join(context_blocks)}\n\n"
        "Answer as a helpful study coach. Make the response feel like clear study notes from a smart TA."
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
