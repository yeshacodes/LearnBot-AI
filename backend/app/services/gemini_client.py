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

    def _parse_json_array(self, text: str) -> list[Any]:
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            text = text[start : end + 1]
        data = json.loads(text)
        if not isinstance(data, list):
            raise ValueError("Model did not return a JSON array")
        return data

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

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
            "You are generating flashcards for LearnBot from uploaded source chunks. "
            "Use only facts stated in the source text. Do not create generic study advice, placeholders, or filename-based cards. "
            f"Return exactly {num_cards} items as a strict JSON array. "
            "Each item must be an object with keys question, answer, topic, difficulty, source_excerpt, tags. "
            "question should be the front of the card and answer should be the back. "
            "source_excerpt must be a short exact-or-close phrase from the provided source text that supports the card. "
            "tags must be an array of short topic strings. "
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

                data = self._parse_json_array(text)

                normalized: list[dict[str, Any]] = []
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    question = str(item.get("question") or item.get("front") or "").strip()
                    answer = str(item.get("answer") or item.get("back") or "").strip()
                    topic = str(item.get("topic") or "").strip()[:80] or "Source concept"
                    card_difficulty = str(item.get("difficulty") or difficulty).strip().lower()
                    source_excerpt = str(item.get("source_excerpt") or "").strip()[:500]
                    tags = self._string_list(item.get("tags"))
                    if not question or not answer:
                        continue
                    metadata_tags = [
                        f"topic:{topic}",
                        f"difficulty:{card_difficulty}",
                        f"excerpt:{source_excerpt}",
                    ]
                    normalized.append(
                        {
                            "question": question,
                            "answer": answer,
                            "topic": topic,
                            "difficulty": card_difficulty,
                            "source_excerpt": source_excerpt,
                            "tags": [*(tags or [topic]), *metadata_tags],
                        }
                    )

                if not normalized:
                    raise ValueError("No valid flashcards returned")

                return normalized[:num_cards]
            except Exception as exc:
                last_error = exc

        raise RuntimeError(f"Failed to generate flashcards: {last_error}")

    def generate_quiz(
        self,
        *,
        source_name: str,
        source_text: str,
        question_count: int = 8,
        difficulty: str = "mixed",
        max_retries: int = 2,
    ) -> list[dict[str, Any]]:
        prompt = (
            "You are generating a LearnBot quiz from uploaded source chunks. "
            "Use only the provided source text. Do not create generic learning-platform questions. "
            f"Return exactly {question_count} multiple-choice questions as a strict JSON array. "
            "Each item must have keys question, choices, correct_answer, explanation, topic, difficulty, source_excerpt. "
            "choices must contain exactly four distinct strings. correct_answer must exactly match one choice. "
            "source_excerpt must be a short supporting phrase from the source text. "
            f"Overall difficulty: {difficulty}. "
            "No markdown. No prose. JSON only.\n\n"
            f"Source title: {source_name}\n\n"
            f"Source text:\n{source_text[:26000]}"
        )

        last_error: Exception | None = None
        for _ in range(max_retries + 1):
            try:
                text = self._require_client().models.generate_content(
                    model=settings.gemini_chat_model,
                    contents=prompt,
                ).text or ""
                data = self._parse_json_array(text)
                normalized: list[dict[str, Any]] = []
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    question = str(item.get("question") or "").strip()
                    choices = self._string_list(item.get("choices"))
                    correct_answer = str(item.get("correct_answer") or "").strip()
                    explanation = str(item.get("explanation") or "").strip()
                    topic = str(item.get("topic") or "").strip()[:80] or "Source concept"
                    item_difficulty = str(item.get("difficulty") or difficulty).strip().lower()
                    source_excerpt = str(item.get("source_excerpt") or "").strip()[:500]

                    distinct_choices = list(dict.fromkeys(choices))
                    if len(distinct_choices) != 4 or correct_answer not in distinct_choices:
                        continue
                    if not question or not explanation:
                        continue
                    normalized.append(
                        {
                            "question": question,
                            "choices": distinct_choices,
                            "correct_answer": correct_answer,
                            "explanation": explanation,
                            "topic": topic,
                            "difficulty": item_difficulty,
                            "source_excerpt": source_excerpt,
                        }
                    )

                if not normalized:
                    raise ValueError("No valid quiz questions returned")
                return normalized[:question_count]
            except Exception as exc:
                last_error = exc

        raise RuntimeError(f"Failed to generate quiz: {last_error}")
