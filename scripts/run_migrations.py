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
MIGRATIONS = [
    ROOT / "supabase" / "migrations" / "001_schema.sql",
    ROOT / "supabase" / "migrations" / "002_security_sessions.sql",
    ROOT / "supabase" / "migrations" / "003_onboarding.sql",
    ROOT / "supabase" / "seed.sql",
]

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
        print("\nEjecutando migraciones + seed:")
        for path in MIGRATIONS:
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

        print(f"\nOK Completado — instituciones: {inst}, recursos: {res}, KPIs: {kpis}")
        print("\nSiguiente paso: crear usuarios en Supabase Auth y ejecutar supabase/setup-demo-users.sql")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
