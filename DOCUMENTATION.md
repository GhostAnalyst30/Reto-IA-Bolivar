# Documentación técnica — UTB Te acompaña

## 1. Requisitos

- Node.js 18+, pnpm
- Python 3.11+
- Proyecto Supabase
- Cuenta Resend (correos)
- OpenRouter API key

## 2. Supabase — instalación limpia

Ejecutar en orden (o `python scripts/run_migrations.py --reset`):

| Orden | Archivo |
|-------|---------|
| 1 | `supabase/000_reset.sql` |
| 2 | `supabase/001_schema.sql` |
| 3 | `supabase/002_rls_and_seed.sql` |
| 4 | `supabase/005_accompaniment.sql` |
| 5 | `supabase/008_auth_username.sql` |
| 6 | `supabase/007_resource_embeddings_rls.sql` |
| 7 | `pnpm --filter @reto/web exec tsx ../../scripts/seed-platform-admin.ts` |
| 8 | `supabase/004_seed_demo_utb.sql` + `006` (demo, opcional) |

O con el script automatizado:

```bash
python scripts/run_migrations.py
pnpm --filter @reto/web exec tsx ../../scripts/seed-platform-admin.ts
```

### Módulos UTB Te acompaña

**Estudiante:** `/student/onboarding/survey`, `/student/twin/summary`, `/student/twin/chat`, `/student/opportunities`, `/student/resources`

**Institucional:** `/institutional/dashboard`, `/institutional/risk`, `/institutional/students/[id]`, `/institutional/admin`

### Demo UTB (opcional)

1. Login como `admin` (platform admin)
2. Crear institución UTB + gestor desde la UI, **o**:
3. `pnpm --filter @reto/web exec tsx ../../scripts/seed-utb-users.ts` + `python scripts/run_migrations.py --demo`

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
RESEND_FROM_EMAIL=UTB Te acompaña <onboarding@resend.dev>
WEEKLY_REPORT_EMAIL=ascendraemmanuel@gmail.com
PASSWORD=tu-password-postgres-supabase
```

### `apps/api/.env`

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=tu-jwt-secret
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

| Usuario | Email | Contraseña | Rol | Portal |
|---------|-------|------------|-----|--------|
| `admin` | `ascendraemmanuel@gmail.com` | `Demo2026!` (o `SEED_DEMO_PASSWORD`) | platform_admin | `/platform/dashboard` |
| `admin_utb` | `admin@utb.demo` | `Demo2026!` | admin institucional | `/institutional/admin` |
| `rector` | `rector@utb.demo` | `Demo2026!` | rector | `/institutional/analytics` |
| `estudiante01` | `estudiante01@utb.demo` | `Demo2026!` | student | `/student/twin/chat` |

**Registro producción:** solo correos `@utb.edu.co`. Login con **username + contraseña** (no email).

Las cuentas `@utb.demo` **no reciben correos** de confirmación ni notificaciones.

## 6. Flujos principales

### Platform admin
1. Login con usuario `admin` → `/platform/dashboard`
2. Crear institución + gestor
3. Ver todos los usuarios en `/platform/users`

### Gestor institucional
1. Login → `/institutional/admin`
2. Aprobar solicitudes en `/institutional/admin/requests`
3. Generar `auth_key` en `/institutional/admin/auth-keys`
4. Compartir clave para registro en `/register/institutional`

### Estudiante
1. `/register/student` — correo `@utb.edu.co`, username, contraseña
2. Esperar aprobación en `/pending-approval`
3. Encuesta psicométrica → Digital Twin → `/student/*`

### Directivo
1. `/register/institutional` — `@utb.edu.co` + username + auth_key activa
2. Login con username + contraseña

### Perfil
Todos los roles pueden editar nombre y cambiar contraseña en **Mi perfil**.

## 7. Multisesión

- Varias pestañas del mismo usuario comparten sesión Supabase
- Cada login registra entrada en `user_sessions` (máx. 5 activas)
- El admin institucional puede revocar sesiones en `/institutional/admin/security`

## 8. Deploy

- **Vercel:** root `apps/web`
- **Render:** `render.yaml`, root `apps/api`
- **Supabase:** redirect URLs → `https://tu-app.vercel.app/**`

## 9. Confirmación de correo (Resend)

El registro usa BFF + Resend. Configurar en Supabase → Authentication → URL Configuration:

- Site URL: tu dominio
- Redirect URLs: `https://tu-dominio/auth/callback`

Ver `NEW_IDEA.md` para alcance funcional y `PLAN-PLATAFORMA.md` para arquitectura completa.
