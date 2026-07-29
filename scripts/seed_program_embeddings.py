#!/usr/bin/env python3
"""Precompute and store Gemini embeddings for active academic programs.

Run once after applying 021_program_domains_and_embeddings.sql, and again
whenever the program catalog changes. Idempotent: upserts per program_id.

Usage:
    python scripts/seed_program_embeddings.py

Reads GEMINI_API_KEY from apps/api/.env (or env). Uses Gemini
text-embedding-004 (768-dim) via core.embeddings. Stores vectors in the
program_embeddings table through the Supabase REST API (service role key).
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))


def _load_env() -> None:
    api_env = ROOT / "apps" / "api" / ".env"
    if api_env.exists():
        for line in api_env.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def _pg_vector_literal(vec: list[float]) -> str:
    """Format a Python list as a Postgres VECTOR string literal: '[1,2,3]'."""
    return "[" + ",".join(f"{float(x):.8f}" for x in vec) + "]"


async def main() -> int:
    _load_env()
    from core.config import settings
    from core.embeddings import EMBEDDING_MODEL, embed_texts
    from core.supabase_client import get_supabase

    if not settings.gemini_api_key:
        print("GEMINI_API_KEY no configurado en apps/api/.env — abortando.")
        return 1

    sb = get_supabase()
    programs = (
        sb.table("academic_programs")
        .select("id, name, description")
        .eq("is_active", True)
        .execute()
        .data or []
    )
    if not programs:
        print("No hay programas activos. Ejecuta primero 020_utb_programs_catalog.sql.")
        return 1

    texts = [f"{p['name']}. {p.get('description') or ''}".strip() for p in programs]
    print(f"Embebiendo {len(programs)} programas con {EMBEDDING_MODEL}...")
    vectors = await embed_texts(texts)
    if not vectors or len(vectors) != len(programs):
        print("Error: no se pudieron generar embeddings para todos los programas.")
        return 1

    # Supabase REST (PostgREST) does not accept VECTOR literals directly as JSON;
    # we use the SQL HTTP endpoint (rpc) via execute_sql-style raw SQL through
    # the pg_net/edge path is overkill. Instead, upsert via raw SQL through the
    # service-role database connection when available; otherwise fall back to a
    # rpc function. Here we use a simple approach: build a single SQL string and
    # execute it via the supabase-py `postgrest` cannot run raw SQL, so we use the
    # Supabase REST `/rest/v1/rpc` only if a helper exists. To keep this script
    # dependency-light, we emit SQL to stdout when direct DB access is unavailable.
    sql_lines = [
        "INSERT INTO program_embeddings (program_id, embedding, model) VALUES",
    ]
    values = []
    for p, vec in zip(programs, vectors):
        values.append(
            f"  ('{p['id']}'::uuid, '{_pg_vector_literal(vec)}'::vector, '{EMBEDDING_MODEL}')"
        )
    sql_lines.append(",\n".join(values))
    sql_lines.append(
        "ON CONFLICT (program_id) DO UPDATE SET "
        "embedding = EXCLUDED.embedding, model = EXCLUDED.model, "
        "embedded_at = NOW();"
    )
    sql = "\n".join(sql_lines)

    # Try direct DB execution via psycopg2 if available (matches run_migrations.py)
    try:
        import psycopg2  # type: ignore
        from urllib.parse import quote_plus
        from scripts.run_migrations import get_connection_string  # type: ignore
        conn = psycopg2.connect(get_connection_string())
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.close()
        print(f"OK — {len(programs)} embeddings almacenados en program_embeddings.")
        return 0
    except Exception as exc:
        # Fall back to printing SQL for manual execution
        out_path = ROOT / "supabase" / "seed_program_embeddings.generated.sql"
        out_path.write_text(sql, encoding="utf-8")
        print(f"No se pudo escribir directamente en la BD ({exc}).")
        print(f"SQL generado en: {out_path}")
        print("Ejecútalo con: python scripts/run_migrations.py --patch 021 (para esquema) y luego aplica este SQL.")
        return 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
