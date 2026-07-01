# Documentación técnica — Bolívar IA

## 1. Requisitos

- Node.js 18+, pnpm
- Python 3.11+
- Proyecto Supabase
- Cuenta Resend (correos)
- OpenRouter API key

## 2. Supabase — instalación limpia

Ejecutar en orden en SQL Editor (o `python scripts/run_migrations.py --reset`):

| Orden | Archivo |
|-------|---------|
| 1 | `supabase/000_reset.sql` |
| 2 | `supabase/001_schema.sql` |
| 3 | `supabase/002_rls_and_seed.sql` |
| 4 | `npx tsx scripts/seed-platform-admin.ts` |
| 5 | `supabase/003_seed_platform_admin.sql` (opcional si el script ya upsertea) |

**No hay instituciones pre-cargadas.** El platform admin las crea desde `/platform/institutions`.

### Demo UTB (opcional)

1. Iniciar sesión como `admin@bolivar.ia.com`
2. Crear institución UTB + gestor `admin@utb.demo` desde la UI, **o**:
3. `npx tsx scripts/seed-utb-users.ts` + `supabase/004_seed_demo_utb.sql`

## 3. Variables de entorno

### `apps/web/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=eyJ...
INTERNAL_REGISTER_KEY=mismo-secreto-que-en-api
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Bolívar IA <onboarding@resend.dev>
WEEKLY_REPORT_EMAIL=ascendraemmanuel@gmail.com
```

### `apps/api/.env`

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-...
ALLOWED_ORIGINS=http://localhost:3000
APP_URL=http://localhost:3000
INTERNAL_REGISTER_KEY=mismo-secreto-que-en-web
```

## 4. Ejecutar en local

```bash
pnpm install
cd apps/api && pip install -r requirements.txt
pnpm dev:api    # terminal 1
pnpm dev:web    # terminal 2
```

## 5. Cuentas

| Email | Contraseña | Rol | Portal |
|-------|------------|-----|--------|
| `admin@bolivar.ia.com` | `Demo2026!` (o SEED_DEMO_PASSWORD) | platform_admin | `/platform/dashboard` |
| `admin@utb.demo` | `Demo2026!` | admin institucional | `/institutional/admin` |
| `rector@utb.demo` | `Demo2026!` | rector | `/institutional/analytics` |
| `estudiante01@utb.demo` | `Demo2026!` | student | `/student/chat` |

Las cuentas `@utb.demo` y `@bolivar.ia.com` **no reciben correos** de confirmación ni notificaciones.

## 6. Flujos principales

### Platform admin
1. Login → `/platform/dashboard`
2. Crear institución + gestor (email/contraseña del admin institucional)
3. Ver todos los usuarios en `/platform/users`

### Gestor institucional
1. Login → `/institutional/admin`
2. Aprobar solicitudes en `/institutional/admin/requests`
3. Generar `auth_key` en `/institutional/admin/auth-keys`
4. Compartir clave para registro en `/register/institutional`

### Estudiante
1. `/register/student` → seleccionar institución o vincular después
2. Esperar aprobación en `/pending-approval`
3. Acceso a `/student/*`

### Perfil
Todos los roles pueden editar nombre y cambiar contraseña en **Mi perfil** (notificación por correo excepto cuentas demo).

## 7. Multisesión

- Varias pestañas del mismo usuario comparten sesión Supabase (comportamiento estándar)
- Cada login registra entrada en `user_sessions` (máx. 5 activas)
- El admin institucional puede revocar sesiones en `/institutional/admin/security`
- Error 403 ya no cierra sesión en otras pestañas (solo 401)

## 8. Deploy

- **Vercel:** root `apps/web`
- **Render:** `render.yaml`, root `apps/api`
- **Supabase:** redirect URLs → `https://tu-app.vercel.app/**`

## 9. Confirmación de correo (Resend)

El registro usa BFF + Resend (no el rate limit de Supabase). Configurar en Supabase → Authentication → URL Configuration:

- Site URL: tu dominio
- Redirect URLs: `https://tu-dominio/auth/callback`

Ver `PLAN-PLATAFORMA.md` para arquitectura completa.
