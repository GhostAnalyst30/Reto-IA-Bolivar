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

# Base schema (fresh installs). On existing DBs, already-exists errors are skipped.
BASE_MIGRATIONS = [
    SUPABASE / "001_schema.sql",
    SUPABASE / "002_rls.sql",
    SUPABASE / "003_seed_utb.sql",
]

# Incremental patches in order (004–018)
INCREMENTAL = [
    SUPABASE / "004_seed_platform_admin.sql",
    SUPABASE / "007_drop_username.sql",
    SUPABASE / "008_allow_exception_email.sql",
    SUPABASE / "009_performance_indexes.sql",
    SUPABASE / "010_users_management.sql",
    SUPABASE / "011_align_metrics.sql",
    SUPABASE / "012_dropout_enhancements.sql",
    SUPABASE / "013_platform_dashboard_roles.sql",
    SUPABASE / "014_messages_counselor_role.sql",
    SUPABASE / "015_chat_human_handoff.sql",
    SUPABASE / "016_chat_performance_indexes.sql",
    SUPABASE / "017_retention_os.sql",
    SUPABASE / "018_four_roles.sql",
]

PATCHES = {p.stem.split("_", 1)[0]: p for p in INCREMENTAL}

RESET = SUPABASE / "000_reset.sql"
DEMO_SEED = SUPABASE / "005_seed_demo_utb.sql"
DEMO_ACCOMPANIMENT = SUPABASE / "006_seed_accompaniment_utb.sql"

PROJECT_REF = "vecvvcryqhgrtulnqnxq"

SKIP_HINTS = (
    "already exists",
    "duplicate",
    "does not exist",  # DROP IF missing / legacy cleanup
)


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


def run_sql_file(conn, path: Path, *, allow_skip: bool = True) -> str:
    sql = path.read_text(encoding="utf-8")
    print(f"  >> {path.name}...", end=" ", flush=True)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        print("OK")
        return "ok"
    except psycopg2.Error as e:
        err = str(e).strip()
        if allow_skip and any(h in err.lower() for h in SKIP_HINTS):
            print(f"SKIP ({err.splitlines()[0][:80]})")
            conn.rollback()
            # Autocommit mode: rollback may be no-op; reconnect cursor state
            return "skip"
        print(f"\n  ✗ Error en {path.name}:\n{err}")
        raise


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Ejecuta scripts SQL de Supabase")
    parser.add_argument("--reset", action="store_true", help="Ejecutar 000_reset.sql antes (borra todo)")
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Ejecutar seeds demo UTB (005 + 006) tras migraciones",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Ejecutar base + todos los parches incrementales (004–018)",
    )
    parser.add_argument(
        "--patch",
        metavar="ID",
        help="Ejecutar un parche incremental (ej: 018)",
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
            patch_path = PATCHES.get(args.patch) or PATCHES.get(args.patch.zfill(3))
            if not patch_path:
                print(f"Parche desconocido: {args.patch}. Disponibles: {', '.join(sorted(PATCHES))}")
                sys.exit(1)
            print(f"\nEjecutando parche {args.patch}:")
            try:
                run_sql_file(conn, patch_path, allow_skip=False)
            except psycopg2.Error:
                sys.exit(1)
        else:
            files = []
            if args.reset:
                files.append(RESET)
            # Default and --all: apply base + all incrementals on existing/prod-safe path
            files.extend(BASE_MIGRATIONS)
            files.extend(INCREMENTAL)
            if args.demo:
                files += [DEMO_SEED, DEMO_ACCOMPANIMENT]
            print("\nEjecutando scripts SQL (base + incrementales):")
            for path in files:
                if not path.exists():
                    print(f"  ✗ No encontrado: {path}")
                    sys.exit(1)
                try:
                    run_sql_file(conn, path)
                except psycopg2.Error:
                    sys.exit(1)

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM institutions")
            inst = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM resources")
            res = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM opportunities")
            opportunities = cur.fetchone()[0]
            cur.execute(
                """
                SELECT conname, pg_get_constraintdef(oid)
                FROM pg_constraint
                WHERE conrelid = 'users'::regclass AND contype = 'c' AND conname LIKE '%role%'
                """
            )
            role_checks = cur.fetchall()
            cur.execute(
                "SELECT DISTINCT role FROM users ORDER BY 1"
            )
            roles = [r[0] for r in cur.fetchall()]

        print(f"\nOK Completado — instituciones: {inst}, recursos: {res}, oportunidades: {opportunities}")
        print(f"Roles presentes: {roles}")
        for name, definition in role_checks:
            print(f"Constraint {name}: {definition}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
