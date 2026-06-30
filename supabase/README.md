# Supabase — Scripts SQL

Ejecutar **en orden** en Supabase → SQL Editor (o con `python scripts/run_migrations.py`).

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | [`000_reset.sql`](000_reset.sql) | Elimina tablas, funciones y triggers del proyecto |
| 2 | [`001_schema.sql`](001_schema.sql) | Crea extensiones, tablas, funciones y triggers |
| 3 | [`002_rls_and_seed.sql`](002_rls_and_seed.sql) | RLS, políticas y datos iniciales (UTB, recursos, programas) |
| 4 | [`003_seed_demo_utb.sql`](003_seed_demo_utb.sql) | Perfiles demo `@utb.demo` (tras crear usuarios en Auth) |

## Instalación completa

```bash
# Pasos 1–3 (SQL)
python scripts/run_migrations.py

# Paso 4: usuarios Auth + perfiles demo
SEED_DEMO_PASSWORD=Demo2026! npx tsx scripts/seed-utb-users.ts

# Opcional: sincronizar perfiles si ya existían en Auth
# Ejecutar 003_seed_demo_utb.sql en SQL Editor
```

## Cuentas demo (@utb.demo)

Contraseña por defecto: `Demo2026!`

| Email | Rol |
|-------|-----|
| `admin@utb.demo` | admin |
| `rector@utb.demo` | rector |
| `vicerrector@utb.demo` | vice_president |
| `decano@utb.demo` | dean |
| `director.programa@utb.demo` | area_head |
| `estudiante01@utb.demo` … `estudiante10@utb.demo` | student |

Las cuentas `@utb.demo` **no reciben correos** de confirmación.
