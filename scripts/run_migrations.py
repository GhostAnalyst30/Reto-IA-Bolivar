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
    SUPABASE / "002_rls.sql",
    SUPABASE / "003_seed_utb.sql",
]
PATCHES = {
    "012": SUPABASE / "012_dropout_enhancements.sql",
    "011": SUPABASE / "011_align_metrics.sql",
    "010": SUPABASE / "010_users_management.sql",
    "009": SUPABASE / "009_performance_indexes.sql",
    "008": SUPABASE / "008_allow_exception_email.sql",
    "007": SUPABASE / "007_drop_username.sql",
}
RESET = SUPABASE / "000_reset.sql"
DEMO_SEED = SUPABASE / "005_seed_demo_utb.sql"
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
        help="Ejecutar seeds demo UTB (005 + 006) tras migraciones base",
    )
    parser.add_argument(
        "--patch",
        metavar="ID",
        help="Ejecutar un parche incremental (ej: 009 para índices de rendimiento)",
    )
    args = parser.parse_args()

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
        if args.patch:
            patch_path = PATCHES.get(args.patch)
            if not patch_path:
                print(f"Parche desconocido: {args.patch}. Disponibles: {', '.join(PATCHES)}")
                sys.exit(1)
            print(f"\nEjecutando parche {args.patch}:")
            run_sql_file(conn, patch_path)
        else:
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
            cur.execute("SELECT COUNT(*) FROM opportunities")
            opportunities = cur.fetchone()[0]

        print(f"\nOK Completado — instituciones: {inst}, recursos: {res}, oportunidades: {opportunities}")
        print("\nSiguiente paso:")
        print("  1. SEED_DEMO_PASSWORD=Immanuel3008 npx tsx scripts/seed-platform-admin.ts")
        print("  2. Ejecutar supabase/004_seed_platform_admin.sql en SQL Editor")
        print("  3. (opcional demo) python scripts/run_migrations.py --demo")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
