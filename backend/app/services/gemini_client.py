from __future__ import annotations

import json
from typing import Any

import numpy as np
from google import genai

from ..config import settings


class GeminiService:
    def __init__(self) -> None:
        self.client = genai.Client(api_key=settings.google_api_key) if settings.google_api_key else None

    def _require_client(self) -> genai.Client:
        if self.client is None:
            raise RuntimeError("GOOGLE_API_KEY is required")
        return self.client

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 0), dtype="float32")

        response = self._require_client().models.embed_content(
            model=settings.gemini_embedding_model,
            contents=texts,
        )
        vectors = [item.values for item in response.embeddings]
        return np.array(vectors, dtype="float32")

    def generate_answer(self, prompt: str) -> str:
        response = self._require_client().models.generate_content(
            model=settings.gemini_chat_model,
            contents=prompt,
        )
        return (response.text or "").strip()

    def generate_flashcard(self, question: str, answer: str) -> dict[str, Any]:
        prompt = (
            "Create exactly one study flashcard as JSON with keys "
            "'question' and 'answer'. Keep concise and factual.\n\n"
            f"Source question: {question}\n"
            f"Source answer: {answer}"
        )
        text = self._require_client().models.generate_content(
            model=settings.gemini_flashcard_model,
            contents=prompt,
        ).text or ""

        # Best effort JSON extraction for model variability.
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
        data = json.loads(text)
        return {
            "question": str(data.get("question", question)).strip(),
            "answer": str(data.get("answer", answer)).strip(),
        }

    def generate_flashcards(
        self,
        *,
        source_name: str,
        source_text: str,
        num_cards: int = 20,
        difficulty: str = "mixed",
        max_retries: int = 2,
    ) -> list[dict[str, Any]]:
        prompt = (
            "Generate study flashcards from the provided source text. "
            f"Return exactly {num_cards} items as a strict JSON array. "
            "Each item must be an object with keys question, answer, tags. "
            "tags must be an array of short strings. "
            f"Difficulty should be {difficulty}. "
            "No markdown. No prose. JSON only.\n\n"
            f"Source title: {source_name}\n\n"
            f"Source text:\n{source_text[:24000]}"
        )

        last_error: Exception | None = None
        for _ in range(max_retries + 1):
            try:
                text = self._require_client().models.generate_content(
                    model=settings.gemini_flashcard_model,
                    contents=prompt,
                ).text or ""

                start = text.find("[")
                end = text.rfind("]")
                if start >= 0 and end > start:
                    text = text[start : end + 1]

                data = json.loads(text)
                if not isinstance(data, list):
                    raise ValueError("Model did not return a JSON array")

                normalized: list[dict[str, Any]] = []
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    question = str(item.get("question", "")).strip()
                    answer = str(item.get("answer", "")).strip()
                    tags = item.get("tags", [])
                    if not isinstance(tags, list):
                        tags = []
                    tags = [str(tag).strip() for tag in tags if str(tag).strip()]
                    if not question or not answer:
                        continue
                    normalized.append(
                        {
                            "question": question,
                            "answer": answer,
                            "tags": tags or ["General"],
                        }
                    )

                if not normalized:
                    raise ValueError("No valid flashcards returned")

                return normalized[:num_cards]
            except Exception as exc:
                last_error = exc

        raise RuntimeError(f"Failed to generate flashcards: {last_error}")
