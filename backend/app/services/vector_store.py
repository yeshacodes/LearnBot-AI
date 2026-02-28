from __future__ import annotations

import json
from pathlib import Path

import faiss
import numpy as np


class UserVectorStore:
    def __init__(self, user_dir: Path):
        self.user_dir = user_dir
        self.user_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.user_dir / "faiss.index"
        self.map_path = self.user_dir / "faiss_ids.json"
        self._index: faiss.Index | None = None
        self._id_map: list[str] = []
        self._load()

    def _load(self) -> None:
        if self.map_path.exists():
            self._id_map = json.loads(self.map_path.read_text(encoding="utf-8"))
        if self.index_path.exists():
            self._index = faiss.read_index(str(self.index_path))

    def _save(self) -> None:
        if self._index is not None:
            faiss.write_index(self._index, str(self.index_path))
        self.map_path.write_text(json.dumps(self._id_map), encoding="utf-8")

    def add(self, vectors: np.ndarray, chunk_ids: list[str]) -> None:
        if vectors.size == 0:
            return
        if len(vectors) != len(chunk_ids):
            raise ValueError("Vector and chunk-id count mismatch")
        if self._index is None:
            self._index = faiss.IndexFlatL2(vectors.shape[1])
        self._index.add(vectors)
        self._id_map.extend(chunk_ids)
        self._save()

    def search(self, query_vector: np.ndarray, k: int = 5) -> list[str]:
        if self._index is None or self._index.ntotal == 0:
            return []
        distances, indices = self._index.search(query_vector, min(k, self._index.ntotal))
        result: list[str] = []
        for idx in indices[0]:
            if idx < 0:
                continue
            if idx >= len(self._id_map):
                continue
            result.append(self._id_map[idx])
        return result
