from __future__ import annotations

import json
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class SourceRecord:
    id: str
    user_id: str
    name: str
    source_type: str
    file_path: str | None
    url: str | None
    created_at: str


class Database:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    file_path TEXT,
                    url TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    source_name TEXT NOT NULL DEFAULT '',
                    page INTEGER,
                    snippet TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(source_id) REFERENCES sources(id)
                );

                CREATE TABLE IF NOT EXISTS answers (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    citations_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS flashcards (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    answer_id TEXT,
                    created_at TEXT NOT NULL
                );
                """
            )
            cols = [row["name"] for row in conn.execute("PRAGMA table_info(chunks)").fetchall()]
            if "source_name" not in cols:
                conn.execute("ALTER TABLE chunks ADD COLUMN source_name TEXT NOT NULL DEFAULT ''")

    def create_source(
        self,
        user_id: str,
        name: str,
        source_type: str,
        file_path: str | None = None,
        url: str | None = None,
    ) -> SourceRecord:
        source_id = str(uuid.uuid4())
        created_at = _utc_now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO sources (id, user_id, name, source_type, file_path, url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (source_id, user_id, name, source_type, file_path, url, created_at),
            )
        return SourceRecord(
            id=source_id,
            user_id=user_id,
            name=name,
            source_type=source_type,
            file_path=file_path,
            url=url,
            created_at=created_at,
        )

    def list_sources(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, name, source_type, file_path, url, created_at FROM sources WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_source(self, user_id: str, source_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, user_id, name, source_type, file_path, url, created_at
                FROM sources
                WHERE user_id = ? AND id = ?
                """,
                (user_id, source_id),
            ).fetchone()
        return dict(row) if row else None

    def list_chunk_ids_for_source(self, user_id: str, source_id: str) -> list[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id FROM chunks WHERE user_id = ? AND source_id = ?",
                (user_id, source_id),
            ).fetchall()
        return [str(row["id"]) for row in rows]

    def delete_source_and_chunks(self, user_id: str, source_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM chunks WHERE user_id = ? AND source_id = ?",
                (user_id, source_id),
            )
            conn.execute(
                "DELETE FROM sources WHERE user_id = ? AND id = ?",
                (user_id, source_id),
            )

    def add_chunks(self, user_id: str, source_id: str, chunks: list[dict[str, Any]], source_name: str = "") -> list[str]:
        ids: list[str] = []
        with self._connect() as conn:
            for chunk in chunks:
                chunk_id = str(uuid.uuid4())
                ids.append(chunk_id)
                conn.execute(
                    """
                    INSERT INTO chunks (id, user_id, source_id, source_name, page, snippet, content, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        chunk_id,
                        user_id,
                        source_id,
                        source_name,
                        chunk.get("page"),
                        chunk["snippet"],
                        chunk["content"],
                        _utc_now(),
                    ),
                )
        return ids

    def get_chunks(self, user_id: str, chunk_ids: list[str]) -> list[dict[str, Any]]:
        if not chunk_ids:
            return []
        placeholders = ",".join(["?"] * len(chunk_ids))
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT c.id, c.source_id, c.page, c.snippet, c.content, c.source_name
                FROM chunks c
                WHERE c.user_id = ? AND c.id IN ({placeholders})
                """,
                (user_id, *chunk_ids),
            ).fetchall()
        by_id = {row["id"]: dict(row) for row in rows}
        return [by_id[cid] for cid in chunk_ids if cid in by_id]

    def list_chunks_by_source(self, user_id: str, source_id: str, limit: int | None = None) -> list[dict[str, Any]]:
        query = """
            SELECT id, source_id, source_name, page, snippet, content, created_at
            FROM chunks
            WHERE user_id = ? AND source_id = ?
            ORDER BY created_at ASC
        """
        params: list[Any] = [user_id, source_id]
        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def delete_chunks_by_source(self, user_id: str, source_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM chunks WHERE user_id = ? AND source_id = ?",
                (user_id, source_id),
            )

    def save_answer(self, user_id: str, question: str, answer: str, citations: list[dict[str, Any]]) -> str:
        answer_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO answers (id, user_id, question, answer, citations_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (answer_id, user_id, question, answer, json.dumps(citations), _utc_now()),
            )
        return answer_id

    def get_answer(self, user_id: str, answer_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, question, answer, citations_json, created_at FROM answers WHERE user_id = ? AND id = ?",
                (user_id, answer_id),
            ).fetchone()
        if row is None:
            return None
        result = dict(row)
        result["citations"] = json.loads(result.pop("citations_json"))
        return result

    def create_flashcard(self, user_id: str, question: str, answer: str, answer_id: str | None = None) -> dict[str, Any]:
        flashcard_id = str(uuid.uuid4())
        created_at = _utc_now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO flashcards (id, user_id, question, answer, answer_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (flashcard_id, user_id, question, answer, answer_id, created_at),
            )
        return {
            "id": flashcard_id,
            "question": question,
            "answer": answer,
            "answer_id": answer_id,
            "created_at": created_at,
        }

    def list_flashcards(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, question, answer, answer_id, created_at FROM flashcards WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]
