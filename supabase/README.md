# Supabase — Scripts SQL

Ejecutar **en orden** en Supabase → SQL Editor (o con `python scripts/run_migrations.py`).

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | [`000_reset.sql`](000_reset.sql) | Elimina tablas, funciones y triggers |
| 2 | [`001_schema.sql`](001_schema.sql) | Schema completo (core + acompañamiento + username) |
| 3 | [`002_rls.sql`](002_rls.sql) | RLS y políticas |
| 4 | [`003_seed_utb.sql`](003_seed_utb.sql) | Institución UTB, facultades, recursos base |
| 5 | Script [`seed-platform-admin.ts`](../scripts/seed-platform-admin.ts) | Crea usuario Auth del admin |
| 6 | [`004_seed_platform_admin.sql`](004_seed_platform_admin.sql) | Perfil `platform_admin` |
| 7 | [`005_seed_demo_utb.sql`](005_seed_demo_utb.sql) | **Opcional** — claves demo y perfiles |
| 8 | [`006_seed_accompaniment_utb.sql`](006_seed_accompaniment_utb.sql) | **Opcional** — oportunidades/recursos demo |

## Instalación completa

```bash
python scripts/run_migrations.py --reset
SEED_DEMO_PASSWORD=Immanuel3008 npx tsx scripts/seed-platform-admin.ts
# Luego ejecutar 004_seed_platform_admin.sql en SQL Editor
```

## Cuenta platform admin

| Username | Email | Rol | Contraseña |
|----------|-------|-----|------------|
| `admin` | `ascendraemmanuel@gmail.com` | `platform_admin` | `Immanuel3008` |

## Reglas de registro

- **Estudiantes:** solo correos `@utb.edu.co`. La institución UTB se asigna automáticamente; no hay flujo de vinculación.
- **Personal UTB:** correo `@utb.edu.co` + clave de registro emitida por el admin de plataforma (`role_auth_keys`).
- **Username:** independiente del local-part del correo; elegido en el formulario de registro.
- **Login:** por username (no por email).

## Demo UTB (opcional)

```bash
python scripts/run_migrations.py --demo
# Crear usuarios demo con correos @utb.edu.co en scripts/seed-utb-users.ts
```

Clave demo personal: `DEMO-DEAN-2026` (ver `005_seed_demo_utb.sql`).

Los usuarios demo usan correos como `admin.demo@utb.edu.co`; **no reciben** correos transaccionales (la palabra `demo` antes de `@`).
