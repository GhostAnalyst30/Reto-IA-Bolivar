#!/usr/bin/env python3
"""Ejecuta migraciones SQL + seed contra Supabase Postgres."""
import os
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("Instalando psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

ROOT = Path(__file__).resolve().parent.parent
SUPABASE = ROOT / "supabase"
MIGRATIONS = [
    SUPABASE / "001_schema.sql",
    SUPABASE / "002_rls_and_seed.sql",
    SUPABASE / "005_accompaniment.sql",
    SUPABASE / "007_resource_embeddings_rls.sql",
    SUPABASE / "008_auth_username.sql",
]
RESET = SUPABASE / "000_reset.sql"
DEMO_SEED = SUPABASE / "004_seed_demo_utb.sql"
DEMO_ACCOMPANIMENT = SUPABASE / "006_seed_accompaniment_utb.sql"

PROJECT_REF = "vecvvcryqhgrtulnqnxq"


def get_connection_string() -> str:
    if url := os.getenv("DATABASE_URL"):
        return url

    password = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("PASSWORD")
    if not password:
        raise SystemExit(
            "Falta SUPABASE_DB_PASSWORD o PASSWORD.\n"
            "Obtén la contraseña en Supabase → Project Settings → Database"
        )

    host = os.getenv("SUPABASE_DB_HOST", f"db.{PROJECT_REF}.supabase.co")
    port = os.getenv("SUPABASE_DB_PORT", "5432")
    user = os.getenv("SUPABASE_DB_USER", "postgres")
    db = os.getenv("SUPABASE_DB_NAME", "postgres")

    # Escapar caracteres especiales en password para URL
    from urllib.parse import quote_plus
    pwd = quote_plus(password)
    return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"


def run_sql_file(conn, path: Path):
    sql = path.read_text(encoding="utf-8")
    print(f"  >> {path.name}...", end=" ", flush=True)
    with conn.cursor() as cur:
        cur.execute(sql)
    print("OK")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Ejecuta scripts SQL de Supabase")
    parser.add_argument("--reset", action="store_true", help="Ejecutar 000_reset.sql antes (borra todo)")
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Ejecutar seeds demo UTB (004 + 006) tras migraciones base",
    )
    args = parser.parse_args()
    # Cargar PASSWORD desde apps/web/.env.local si existe
    env_local = ROOT / "apps" / "web" / ".env.local"
    if env_local.exists() and not os.getenv("PASSWORD"):
        for line in env_local.read_text(encoding="utf-8").splitlines():
            if line.startswith("PASSWORD="):
                os.environ["PASSWORD"] = line.split("=", 1)[1].strip()

    api_env = ROOT / "apps" / "api" / ".env"
    if api_env.exists():
        for line in api_env.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

    conn_str = get_connection_string()
    print("Conectando a Supabase Postgres...")

    conn = psycopg2.connect(conn_str)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    try:
        files = ([RESET] if args.reset else []) + MIGRATIONS
        if args.demo:
            files += [DEMO_SEED, DEMO_ACCOMPANIMENT]
        print("\nEjecutando scripts SQL:")
        for path in files:
            if not path.exists():
                print(f"  ✗ No encontrado: {path}")
                sys.exit(1)
            try:
                run_sql_file(conn, path)
            except psycopg2.Error as e:
                err = str(e).strip()
                if "already exists" in err or "duplicate" in err.lower():
                    print(f"SKIP (ya existe)")
                else:
                    print(f"\n  ✗ Error en {path.name}:\n{err}")
                    sys.exit(1)

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM institutions")
            inst = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM resources")
            res = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM institutional_kpis")
            kpis = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = 'opportunities'"
            )
            has_accompaniment = cur.fetchone()[0] == 1
            opportunities = 0
            if has_accompaniment:
                cur.execute("SELECT COUNT(*) FROM opportunities")
                opportunities = cur.fetchone()[0]

        print(f"\nOK Completado — instituciones: {inst}, recursos: {res}, KPIs: {kpis}")
        if has_accompaniment:
            print(f"  Módulo acompañamiento: OK — oportunidades: {opportunities}")
        else:
            print("  AVISO: falta 005_accompaniment.sql (tablas de acompañamiento no presentes)")
        print("\nSiguiente paso:")
        print("  1. npx tsx scripts/seed-platform-admin.ts")
        print("  2. (opcional demo UTB) npx tsx scripts/seed-utb-users.ts")
        print("     Luego: python scripts/run_migrations.py --demo  (o solo 004/006 en SQL Editor)")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
