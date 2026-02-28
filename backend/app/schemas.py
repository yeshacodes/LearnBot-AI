from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class URLIngestRequest(BaseModel):
    url: HttpUrl


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    sourceIds: list[str] | None = None


class Citation(BaseModel):
    source_id: str
    source_name: str
    snippet: str
    page: int | None = None


class ChatResponse(BaseModel):
    answer_id: str
    answer: str
    citations: list[Citation]


class FlashcardGenerateRequest(BaseModel):
    answerId: str | None = None
    question: str | None = None
    answer: str | None = None


class FlashcardOut(BaseModel):
    id: str
    question: str
    answer: str
    answer_id: str | None = None
    created_at: str


class DeckGenerateRequest(BaseModel):
    source_id: str
    deck_name: str | None = None
    num_cards: int = Field(default=20, ge=1, le=50)
    difficulty: str = Field(default="mixed")


class DeckGenerateResponse(BaseModel):
    deck_id: str
    count: int


class DeckOut(BaseModel):
    id: str
    name: str
    source_id: str | None = None
    source_title: str | None = None
    card_count: int
    created_at: str


class DecksListResponse(BaseModel):
    decks: list[DeckOut]


class DeckCardOut(BaseModel):
    id: str
    question: str
    answer: str
    tags: list[str]


class DeckCardsResponse(BaseModel):
    deck: DeckOut
    page: int
    page_size: int
    total: int
    cards: list[DeckCardOut]


class SourceOut(BaseModel):
    id: str
    name: str
    source_type: str
    storage_bucket: str | None = None
    storage_path: str | None = None
    created_at: str


class SourcesListResponse(BaseModel):
    sources: list[SourceOut]


class ErrorOut(BaseModel):
    detail: str | dict[str, Any]
