# Supabase — Scripts SQL

Ejecutar **en orden** en Supabase → SQL Editor (o con `python scripts/run_migrations.py --reset`).

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | [`000_reset.sql`](000_reset.sql) | Elimina tablas, funciones y triggers |
| 2 | [`001_schema.sql`](001_schema.sql) | Schema completo incl. `platform_admin` |
| 3 | [`002_rls_and_seed.sql`](002_rls_and_seed.sql) | RLS y políticas (sin datos de instituciones) |
| 4 | Script + [`003_seed_platform_admin.sql`](003_seed_platform_admin.sql) | Admin de plataforma |
| 5 | [`004_seed_demo_utb.sql`](004_seed_demo_utb.sql) | **Opcional** — demo UTB tras crear institución |

## Instalación completa

```bash
python scripts/run_migrations.py --reset
npx tsx scripts/seed-platform-admin.ts
```

## Cuenta platform admin

| Email | Rol |
|-------|-----|
| `admin@bolivar.ia.com` | `platform_admin` |

Contraseña: `Demo2026!` (o `SEED_DEMO_PASSWORD`)

## Demo UTB (opcional)

Tras crear la institución UTB:

```bash
SEED_DEMO_PASSWORD=Demo2026! npx tsx scripts/seed-utb-users.ts
# Luego ejecutar 004_seed_demo_utb.sql
```

| Email | Rol |
|-------|-----|
| `admin@utb.demo` | admin |
| `rector@utb.demo` | rector |
| `decano@utb.demo` | dean |
| `estudiante01@utb.demo` … | student |

Las cuentas `@utb.demo` y `@bolivar.ia.com` no reciben correos.
