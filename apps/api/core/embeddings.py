"""Lightweight embedding layer via Gemini (text-embedding-004, 768-dim).

Used by the program matcher to blend domain-dot-product scoring with textual
cosine similarity between the student's answers and each program's name +
description. This makes the "neural" recommendation align to the actual
answer text rather than only to hand-picked domain keywords.

Resilient by design: every public function returns ``None`` / empty on any
network or configuration failure, so the matcher degrades gracefully to the
de-biased domain matcher when embeddings are unavailable.
"""
from __future__ import annotations

import logging
from typing import Sequence

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

# Gemini text-embedding-004 produces 768-dim vectors.
EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIM = 768
EMBEDDING_TIMEOUT_S = 20.0


def _base_url() -> str:
    return (settings.gemini_base_url or "https://generativelanguage.googleapis.com/v1beta/openai/").rstrip("/") + "/"


def _api_key() -> str:
    return settings.gemini_api_key or ""


async def embed_texts(texts: Sequence[str]) -> list[list[float]] | None:
    """Embed a batch of texts. Returns None on any failure."""
    if not texts:
        return []
    key = _api_key()
    if not key:
        logger.debug("embed_texts: no GEMINI_API_KEY configured; skipping embeddings")
        return None
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    body = {"model": EMBEDDING_MODEL, "input": list(texts)}
    try:
        async with httpx.AsyncClient(timeout=EMBEDDING_TIMEOUT_S) as client:
            res = await client.post(f"{_base_url()}embeddings", headers=headers, json=body)
            res.raise_for_status()
            data = res.json()
        out = [item["embedding"] for item in data.get("data", [])]
        if len(out) != len(texts):
            logger.warning("embed_texts: expected %d vectors, got %d", len(texts), len(out))
            return None
        return out
    except Exception as exc:
        logger.warning("embed_texts failed: %s", exc)
        return None


async def embed_text(text: str) -> list[float] | None:
    """Embed a single text. Returns None on any failure."""
    if not text or not text.strip():
        return None
    out = await embed_texts([text])
    return out[0] if out else None


def cosine_sim(a: Sequence[float], b: Sequence[float]) -> float:
    """Cosine similarity; tolerates vectors stored as lists or PG vector strings."""
    va = _coerce(a)
    vb = _coerce(b)
    if not va or not vb or len(va) != len(vb):
        return 0.0
    dot = sum(x * y for x, y in zip(va, vb))
    na = sum(x * x for x in va) ** 0.5
    nb = sum(y * y for y in vb) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _coerce(v) -> list[float]:
    if v is None:
        return []
    if isinstance(v, str):
        # PostgREST may return VECTOR columns as "[1,2,3]" strings
        s = v.strip().lstrip("[").rstrip("]")
        try:
            return [float(x) for x in s.split(",") if x.strip() != ""]
        except ValueError:
            return []
    try:
        return [float(x) for x in v]
    except (TypeError, ValueError):
        return []
