from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class URLIngestRequest(BaseModel):
    url: HttpUrl


class ChatHistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    sourceIds: list[str] | None = None
    messages: list[ChatHistoryMessage] | None = None


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
    topic: str | None = None
    difficulty: str | None = None
    source_excerpt: str | None = None
    source_id: str | None = None
    deck_id: str | None = None


class DeckGenerateResponse(BaseModel):
    deck_id: str
    count: int
    deck: DeckOut | None = None
    cards: list[DeckCardOut] = Field(default_factory=list)


class DeckCardsResponse(BaseModel):
    deck: DeckOut
    page: int
    page_size: int
    total: int
    cards: list[DeckCardOut]


class QuizGenerateRequest(BaseModel):
    source_ids: list[str] = Field(min_length=1)
    question_count: int = Field(default=8, ge=1, le=20)
    difficulty: str = Field(default="mixed")


class QuizQuestionOut(BaseModel):
    id: str
    question: str
    choices: list[str]
    correct_answer: str
    explanation: str
    topic: str
    difficulty: str
    source_excerpt: str
    source_id: str | None = None


class QuizGenerateResponse(BaseModel):
    quiz_id: str
    source_ids: list[str]
    questions: list[QuizQuestionOut]


class SourceOut(BaseModel):
    id: str
    name: str
    source_type: str
    storage_bucket: str | None = None
    storage_path: str | None = None
    created_at: str
    status: str | None = None
    chunk_count: int | None = None
    extracted_text_length: int | None = None


class SourcesListResponse(BaseModel):
    sources: list[SourceOut]


class ErrorOut(BaseModel):
    detail: str | dict[str, Any]
