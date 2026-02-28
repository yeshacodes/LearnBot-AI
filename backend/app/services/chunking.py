from __future__ import annotations

from typing import Any


def chunk_text(
    text: str,
    page: int | None = None,
    chunk_size: int = 1000,
    overlap: int = 150,
) -> list[dict[str, Any]]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    chunks: list[dict[str, Any]] = []
    start = 0
    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        content = cleaned[start:end]
        snippet = content[:220]
        chunks.append(
            {
                "page": page,
                "snippet": snippet,
                "content": content,
            }
        )
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks
