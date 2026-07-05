# Supabase — Scripts SQL

Ejecutar **en orden** en Supabase → SQL Editor (o con `python scripts/run_migrations.py`).

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | [`000_reset.sql`](000_reset.sql) | Elimina tablas, funciones y triggers |
| 2 | [`001_schema.sql`](001_schema.sql) | Schema completo + `username`, sin vocacional |
| 3 | [`002_rls_and_seed.sql`](002_rls_and_seed.sql) | RLS y políticas |
| 4 | [`005_accompaniment.sql`](005_accompaniment.sql) | Psicométrica, oportunidades, riesgo |
| 5 | [`008_auth_username.sql`](008_auth_username.sql) | Migración idempotente username |
| 6 | [`007_resource_embeddings_rls.sql`](007_resource_embeddings_rls.sql) | RLS embeddings |
| 7 | Script [`seed-platform-admin.ts`](../scripts/seed-platform-admin.ts) | Admin de plataforma |
| 8 | [`004_seed_demo_utb.sql`](004_seed_demo_utb.sql) | **Opcional** — demo UTB |
| 9 | [`006_seed_accompaniment_utb.sql`](006_seed_accompaniment_utb.sql) | **Opcional** — oportunidades/recursos demo |

## Instalación completa

```bash
python scripts/run_migrations.py --reset
pnpm --filter @reto/web exec tsx ../../scripts/seed-platform-admin.ts
# Demo UTB:
python scripts/run_migrations.py --demo
```

## Cuenta platform admin

| Username | Email | Rol |
|----------|-------|-----|
| `admin` | `ascendraemmanuel@gmail.com` | `platform_admin` |

Contraseña: `Demo2026!` (o `SEED_DEMO_PASSWORD`)

## Demo UTB (opcional)

```bash
SEED_DEMO_PASSWORD=Demo2026! pnpm --filter @reto/web exec tsx ../../scripts/seed-utb-users.ts
python scripts/run_migrations.py --demo
```

| Email demo | Rol |
|------------|-----|
| `admin@utb.demo` | admin |
| `rector@utb.demo` | rector |
| `estudiante01@utb.demo` | student |

Las cuentas `@utb.demo` no reciben correos.

**Registro producción:** solo `@utb.edu.co`. Login por username.
