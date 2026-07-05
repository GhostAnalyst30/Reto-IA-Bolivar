#!/usr/bin/env python3
"""Optional: populate vector embeddings via OpenRouter embedding API.

For MVP, tutor RAG uses tsvector text search + resource_embeddings.chunk_text
(without vectors). Run after 002_rls.sql if you add OPENROUTER_API_KEY and
implement embedding calls against resource_embeddings.embedding.
"""
print("Tutor RAG activo vía búsqueda de texto + fragmentos en resource_embeddings.")
print("Embeddings vectoriales opcionales — no requeridos para el MVP.")
