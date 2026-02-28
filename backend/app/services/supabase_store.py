from __future__ import annotations

import json
from typing import Any

from supabase import Client, create_client


class SupabaseStore:
    def __init__(self, url: str, service_role_key: str, bucket: str = "sources"):
        if not url or not service_role_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        self.client: Client = create_client(url, service_role_key)
        self.bucket = bucket

    def create_source(
        self,
        *,
        source_id: str,
        user_id: str,
        name: str,
        source_type: str,
        storage_bucket: str = "s3",
        storage_path: str = "pending",
    ) -> dict[str, Any]:
        payload = {
            "id": source_id,
            "user_id": user_id,
            "name": name,
            "source_type": source_type,
            "storage_bucket": storage_bucket,
            "storage_path": storage_path,
        }
        response = (
            self.client.table("sources")
            .insert(payload)
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to create source row")
        return response.data[0]

    def create_web_source(
        self,
        *,
        source_id: str,
        user_id: str,
        name: str,
        url: str,
    ) -> dict[str, Any]:
        payload = {
            "id": source_id,
            "user_id": user_id,
            "name": name,
            "source_type": "web",
            "storage_provider": "web",
            "storage_bucket": "web",
            "storage_path": url,
            "metadata": {"url": url},
        }
        try:
            response = self.client.table("sources").insert(payload).execute()
            if response.data:
                return response.data[0]
        except Exception:
            pass

        # Fallback for environments where the sources table has not yet been extended
        # with storage_provider / metadata columns.
        return self.create_source(
            source_id=source_id,
            user_id=user_id,
            name=name,
            source_type="web",
            storage_bucket="web",
            storage_path=url,
        )

    def update_source_storage(
        self,
        *,
        user_id: str,
        source_id: str,
        storage_bucket: str,
        storage_path: str,
    ) -> dict[str, Any]:
        response = (
            self.client.table("sources")
            .update(
                {
                    "storage_bucket": storage_bucket,
                    "storage_path": storage_path,
                }
            )
            .eq("user_id", user_id)
            .eq("id", source_id)
            .is_("deleted_at", "null")
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to update source storage metadata")
        return response.data[0]

    def list_sources(self, user_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table("sources")
            .select("id,name,source_type,storage_bucket,storage_path,created_at")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    def get_source(self, user_id: str, source_id: str) -> dict[str, Any] | None:
        response = (
            self.client.table("sources")
            .select("id,user_id,name,source_type,storage_bucket,storage_path,created_at,deleted_at")
            .eq("user_id", user_id)
            .eq("id", source_id)
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    def soft_delete_source(self, user_id: str, source_id: str) -> None:
        (
            self.client.table("sources")
            .update({"deleted_at": "now()"})
            .eq("user_id", user_id)
            .eq("id", source_id)
            .is_("deleted_at", "null")
            .execute()
        )

    def replace_source_chunks(
        self,
        *,
        source_id: str,
        user_id: str,
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        self.delete_source_chunks(source_id=source_id, user_id=user_id)
        if not chunks:
            return []

        payload = [
            {
                "source_id": source_id,
                "user_id": user_id,
                "chunk_index": index,
                "content": chunk["content"],
            }
            for index, chunk in enumerate(chunks)
            if chunk.get("content")
        ]
        if not payload:
            return []

        response = self.client.table("source_chunks").insert(payload).execute()
        return response.data or []

    def delete_source_chunks(self, *, source_id: str, user_id: str) -> None:
        (
            self.client.table("source_chunks")
            .delete()
            .eq("source_id", source_id)
            .eq("user_id", user_id)
            .execute()
        )

    def list_source_chunks(
        self,
        *,
        source_id: str,
        user_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        query = (
            self.client.table("source_chunks")
            .select("id,source_id,user_id,chunk_index,content,created_at")
            .eq("source_id", source_id)
            .eq("user_id", user_id)
            .order("chunk_index")
        )
        if limit is not None:
            query = query.limit(limit)
        response = query.execute()
        return response.data or []

    def get_profile_display_name(self, user_id: str) -> str | None:
        response = (
            self.client.table("profiles")
            .select("display_name")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0].get("display_name")

    def create_deck(
        self,
        *,
        user_id: str,
        source_id: str | None,
        name: str,
    ) -> dict[str, Any]:
        response = (
            self.client.table("decks")
            .insert(
                {
                    "user_id": user_id,
                    "source_id": source_id,
                    "name": name,
                }
            )
            .execute()
        )
        if not response.data:
            raise RuntimeError("Failed to create deck")
        return response.data[0]

    def insert_flashcards(self, deck_id: str, cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
        payload = [
            {
                "deck_id": deck_id,
                "question": card["question"],
                "answer": card["answer"],
                "tags": card.get("tags", []),
            }
            for card in cards
        ]
        response = self.client.table("flashcards").insert(payload).execute()
        return response.data or []

    def list_decks(self, user_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table("decks")
            .select("id,user_id,source_id,name,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        decks = response.data or []
        if not decks:
            return []

        source_ids = [deck["source_id"] for deck in decks if deck.get("source_id")]
        source_titles: dict[str, str] = {}
        if source_ids:
            source_response = (
                self.client.table("sources")
                .select("id,name")
                .in_("id", source_ids)
                .execute()
            )
            source_titles = {row["id"]: row["name"] for row in (source_response.data or [])}

        counts_response = (
            self.client.table("flashcards")
            .select("id,deck_id")
            .in_("deck_id", [deck["id"] for deck in decks])
            .execute()
        )
        counts: dict[str, int] = {}
        for row in counts_response.data or []:
            deck_id = row["deck_id"]
            counts[deck_id] = counts.get(deck_id, 0) + 1

        return [
            {
                "id": deck["id"],
                "name": deck["name"],
                "source_id": deck.get("source_id"),
                "source_title": source_titles.get(deck.get("source_id") or "", None),
                "card_count": counts.get(deck["id"], 0),
                "created_at": deck["created_at"],
            }
            for deck in decks
        ]

    def get_deck(self, user_id: str, deck_id: str) -> dict[str, Any] | None:
        response = (
            self.client.table("decks")
            .select("id,user_id,source_id,name,created_at")
            .eq("user_id", user_id)
            .eq("id", deck_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        deck = response.data[0]
        source_title = None
        if deck.get("source_id"):
            source = self.get_source(user_id=user_id, source_id=deck["source_id"])
            source_title = source.get("name") if source else None
        return {
            "id": deck["id"],
            "name": deck["name"],
            "source_id": deck.get("source_id"),
            "source_title": source_title,
            "created_at": deck["created_at"],
        }

    def get_deck_cards(self, deck_id: str, page: int, page_size: int) -> tuple[int, list[dict[str, Any]]]:
        all_response = (
            self.client.table("flashcards")
            .select("id,deck_id,question,answer,tags,created_at")
            .eq("deck_id", deck_id)
            .order("created_at")
            .execute()
        )
        rows = all_response.data or []
        total = len(rows)
        start = max((page - 1) * page_size, 0)
        end = start + page_size
        paged = rows[start:end]
        normalized = []
        for row in paged:
            tags = row.get("tags", [])
            if isinstance(tags, str):
                try:
                    tags = json.loads(tags)
                except Exception:
                    tags = [tags]
            normalized.append(
                {
                    "id": row["id"],
                    "question": row["question"],
                    "answer": row["answer"],
                    "tags": tags if isinstance(tags, list) else [],
                    "created_at": row["created_at"],
                }
            )
        return total, normalized
