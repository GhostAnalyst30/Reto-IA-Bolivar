# Documentación técnica — UTB Te acompaña

## 1. Requisitos

- Node.js 18+, pnpm
- Python 3.11+
- Proyecto Supabase
- Cuenta Brevo (correos)
- OpenRouter API key

## 2. Supabase — instalación limpia

Ejecutar **en orden**:

| Orden | Archivo / Comando | Qué hace |
|-------|-------------------|----------|
| 1 | `supabase/000_reset.sql` | Elimina tablas, funciones y triggers |
| 2 | `supabase/001_schema.sql` | Schema completo (el trigger `handle_new_user` marca a `ascendraemmanuel@gmail.com` como `platform_admin`) |
| 3 | `supabase/002_rls.sql` | RLS y políticas |
| 4 | `supabase/003_seed_utb.sql` | Institución UTB, facultades, recursos base |
| 5 | `SEED_DEMO_PASSWORD=Immanuel3008 pnpm --filter @reto/web exec tsx ../../scripts/seed-platform-admin.ts` | Crea el usuario Auth del platform admin |
| 6 | `supabase/004_seed_platform_admin.sql` | Red de seguridad idempotente del perfil `platform_admin` |

Los pasos 1–4 también se aplican con `python scripts/run_migrations.py --reset`.

### Demo UTB (opcional)

```bash
# 1. Crear usuarios demo en Auth + tabla users (correos @utb.edu.co)
SEED_DEMO_PASSWORD=Demo2026! pnpm --filter @reto/web exec tsx ../../scripts/seed-utb-users.ts
# 2. Aplicar seeds demo (claves de rol, oportunidades y recursos: 005 + 006)
python scripts/run_migrations.py --demo
```

Ejecuta `seed-utb-users.ts` **antes** de `--demo`: los `UPDATE` de `005_seed_demo_utb.sql` operan sobre los usuarios ya creados.

### Módulos UTB Te acompaña

**Estudiante:** `/student/onboarding/survey` → `/student/twin/summary`, `/student/twin/chat`, `/student/opportunities`, `/student/resources`, `/student/paths`, `/student/progress`, `/student/profile`. La encuesta psicométrica es obligatoria antes de acceder al Digital Twin.

**Institucional:** `/institutional/dashboard`, `/institutional/analytics`, `/institutional/prediction`, `/institutional/risk`, `/institutional/students/[id]`, `/institutional/director`, `/institutional/admin`.

> La orientación vocacional está **fusionada** en la encuesta psicométrica (no es un módulo aparte).

## 3. Variables de entorno

### `apps/web/.env.local`

```env
# Públicas (expuestas al navegador)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Servidor (nunca expuestas al navegador)
API_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=eyJ...
INTERNAL_REGISTER_KEY=mismo-secreto-que-en-api
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=UTB Te acompaña <noreply@tudominio.com>
WEEKLY_REPORT_EMAIL=ascendraemmanuel@gmail.com
CRON_SECRET=genera-un-secreto-cron       # protege /api/cron/weekly-report

# Migraciones/seeds (solo para scripts locales)
PASSWORD=tu-password-postgres-supabase   # usada por scripts/run_migrations.py
SEED_DEMO_PASSWORD=Demo2026!
```

### `apps/api/.env`

```env
# Obligatorias
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALLOWED_ORIGINS=http://localhost:3000
INTERNAL_REGISTER_KEY=mismo-secreto-que-en-web

# Recomendadas
SUPABASE_JWT_SECRET=tu-jwt-secret        # verificación JWT local (más rápida)
APP_URL=http://localhost:3000            # URL del frontend (enlaces de correo, Referer OpenRouter)

# Chatbots / LLM (opcional; sin proveedor los chats dan respuesta demo)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL_TUTOR=meta-llama/llama-3.2-3b-instruct:free
LLM_MODEL_DIRECTOR=meta-llama/llama-3.2-3b-instruct:free
LLM_MODEL_PATH=meta-llama/llama-3.2-3b-instruct:free
# Fallbacks opcionales: GEMINI_API_KEY, HUGGINGFACE_API_KEY, LITELLM_API_BASE, LITELLM_API_KEY

# Scraper de recursos (opcional)
SCRAPER_ENABLED=true
YOUTUBE_API_KEY=
```

## 4. Ejecutar en local

```bash
pnpm install
cd apps/api && pip install -r requirements.txt
pnpm dev:api    # terminal 1
pnpm dev:web    # terminal 2
```

## 5. Cuentas

Login siempre por **correo institucional + contraseña**.

| Usuario | Email | Contraseña | Rol | Portal |
|---------|-------|------------|-----|--------|
| `admin` | `ascendraemmanuel@gmail.com` | `Immanuel3008` (o `SEED_DEMO_PASSWORD`) | platform_admin | `/platform/dashboard` |
| `admin_utb` | `admin.demo@utb.edu.co` | `Demo2026!` | admin institucional | `/institutional/admin` |
| `rector` | `rector.demo@utb.edu.co` | `Demo2026!` | rector | `/institutional/dashboard` |
| `vicerrector` | `vicerrector.demo@utb.edu.co` | `Demo2026!` | vice_president | `/institutional/dashboard` |
| `decano` | `decano.demo@utb.edu.co` | `Demo2026!` | dean | `/institutional/dashboard` |
| `director_prog` | `director.demo@utb.edu.co` | `Demo2026!` | area_head | `/institutional/dashboard` |
| `estudiante01`…`estudiante10` | `estudianteNN.demo@utb.edu.co` | `Demo2026!` | student | `/student/twin/summary` |

**Registro producción:** solo correos `@utb.edu.co`. Login con **correo + contraseña**.

**Registro:** requiere que la API esté corriendo (`pnpm dev:api`) y que `INTERNAL_REGISTER_KEY` sea idéntica en web y API.

Los correos transaccionales se envían a cualquier dirección registrada, **excepto** cuentas demo (las que llevan `demo` antes de la `@`, p. ej. `admin.demo@utb.edu.co`).

## 6. Flujos principales

### Platform admin
1. Login con correo `ascendraemmanuel@gmail.com` → `/platform/dashboard`
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

### 8.1 Variables en Vercel (frontend `apps/web`)

**Públicas (`NEXT_PUBLIC_*`)**

| Variable | Obligatoria | Para qué |
|----------|:-:|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase (cliente/SSR/middleware) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave anónima para login/sesión |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública (`https://tu-app.vercel.app`) |
| `EMAIL_APP_URL` | ⬜ (recomendada) | Base de enlaces en correos; en local puede ser Vercel mientras desarrollas |

**Secretas de servidor**

| Variable | Obligatoria | Para qué |
|----------|:-:|----------|
| `API_URL` | ✅ | URL del backend en Render (`https://tu-api.onrender.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Crear usuarios, `generateLink`, lookups de registro |
| `INTERNAL_REGISTER_KEY` | ✅ | **Debe coincidir con Render** |
| `BREVO_API_KEY` | ✅ (correos reales) | Envío por Brevo; sin ella solo se loguea |
| `BREVO_FROM_EMAIL` | ⬜ | Remitente verificado en Brevo (Senders) |

**Despliegue Vercel (correos):** además de `BREVO_API_KEY` y `BREVO_FROM_EMAIL`, configura `EMAIL_APP_URL=https://tu-app.vercel.app` y `NEXT_PUBLIC_APP_URL` con la misma URL. En Supabase → Authentication → URL Configuration, agrega `https://tu-app.vercel.app/auth/confirm` y `https://tu-app.vercel.app/**` en Redirect URLs. En Brevo, autoriza las IPs de Vercel o desactiva la restricción de IP para producción.
| `WEEKLY_REPORT_EMAIL` | ⬜ | Destinatario del reporte semanal |
| `CRON_SECRET` | ✅ (si usas cron) | Protege `/api/cron/weekly-report` |
| `INTERNAL_CRON_TOKEN` | ⬜ | Bearer que el cron reenvía al backend |

### 8.2 Variables en Render (backend `apps/api`)

| Variable | Obligatoria | Para qué |
|----------|:-:|----------|
| `SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Acceso a BD y `auth.admin` |
| `ALLOWED_ORIGINS` | ✅ | CORS = tu dominio de Vercel |
| `INTERNAL_REGISTER_KEY` | ✅ | **Debe coincidir con Vercel** |
| `SUPABASE_JWT_SECRET` | ⬜ (recomendada) | Verificación JWT local (más rápida) |
| `APP_URL` | ⬜ (recomendada) | URL del frontend (enlaces de correo, Referer OpenRouter) |
| `OPENROUTER_API_KEY` | ⬜ | Proveedor principal de los chatbots |
| `OPENROUTER_BASE_URL`, `LLM_MODEL_TUTOR`, `LLM_MODEL_DIRECTOR`, `LLM_MODEL_PATH` | ⬜ | Config LLM (tienen default) |
| `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `LITELLM_API_BASE`, `LITELLM_API_KEY` | ⬜ | Proveedores LLM de fallback |
| `SCRAPER_ENABLED`, `YOUTUBE_API_KEY` | ⬜ | Scraper de recursos externos |
| `CRON_SECRET` | ⬜ | Solo si el cron llama al backend |

### 8.3 Dependencias cruzadas (evita fallos de conexión)

- `INTERNAL_REGISTER_KEY` **idéntica** en Vercel y Render.
- `API_URL` (Vercel) → URL de Render · `ALLOWED_ORIGINS` y `APP_URL` (Render) → URL de Vercel.
- `CRON_SECRET` igual en ambos si activas el reporte semanal.
- Migraciones/seeds: `PASSWORD` (o `DATABASE_URL`) + `SEED_DEMO_PASSWORD`.

## 9. Confirmación de correo (Brevo)

El registro usa BFF + Brevo con página `/auth/confirm` (clic explícito, resiste escáneres de correo). Configurar en Supabase → Authentication → URL Configuration:

- Site URL: tu dominio
- Redirect URLs: `https://tu-dominio/auth/callback`

Ver `NEW_IDEA.md` para alcance funcional y `PLAN-PLATAFORMA.md` para arquitectura completa.
