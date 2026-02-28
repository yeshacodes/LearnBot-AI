from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

from .chunking import chunk_text


def pdf_to_chunks(file_path: Path) -> list[dict]:
    reader = PdfReader(str(file_path))
    all_chunks: list[dict] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        all_chunks.extend(chunk_text(text, page=page_number))
    return all_chunks


def url_to_name(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc or "web-resource"
    return host + (parsed.path if parsed.path else "")


async def url_to_chunks(url: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url)
        response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    text = soup.get_text(separator=" ", strip=True)
    return chunk_text(text, page=None)


async def fetch_web_document(url: str) -> tuple[str, str, list[dict]]:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header", "aside"]):
        tag.extract()

    main = soup.find("main") or soup.find("article") or soup.find(role="main") or soup.body or soup
    title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    page_title = title or url
    text = main.get_text(separator=" ", strip=True)
    return page_title, text, chunk_text(text, page=None)
