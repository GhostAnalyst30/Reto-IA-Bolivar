# UTB Te acompaña — Plataforma de acompañamiento estudiantil

Microservicio exclusivo de la **Universidad Tecnológica de Bolívar (UTB)** con portal estudiante (Digital Twin, oportunidades, recursos, aprendizaje) y suite institucional (analítica, predicción, riesgo de deserción, administración). Registro con `@utb.edu.co`, login por **correo + contraseña**, `auth_key` para directivos.

> **Alcance UTB-only:** la plataforma opera para una sola institución (UTB). No se crean ni gestionan otras universidades.

## Roles

| Rol | Acceso |
|-----|--------|
| `platform_admin` | Administrador operativo UTB: usuarios globales, riesgo, contenido (`ascendraemmanuel@gmail.com`) |
| `admin` | Gestor UTB: solicitudes, claves de rol, programas, bandeja de apoyo |
| `rector`, `dean`, etc. | Suite institucional: dashboard, analítica, predicción, riesgo, acciones |
| `student` | Portal estudiante tras aprobación |

## Módulos institucionales (deserción)

| Ruta | Función |
|------|---------|
| `/institutional/dashboard` | KPIs y cohortes en riesgo |
| `/institutional/analytics` | Analítica extendida |
| `/institutional/prediction` | Proyección de retención (heurística v1) |
| `/institutional/risk` | Reporte de riesgo por estudiante |
| `/institutional/actions` | Acciones sugeridas |
| `/institutional/admin/support-requests` | Solicitudes de apoyo humano |
| `/institutional/admin/academic-outcomes` | Estados académicos (retiro, graduación) |

## Stack

Next.js 14 · FastAPI · Supabase (Auth + PostgreSQL + RLS) · OpenRouter · Brevo

## Inicio rápido

```bash
pnpm install
# Ver DOCUMENTATION.md para variables de entorno y migraciones
pnpm dev:api   # puerto 8000
pnpm dev:web   # puerto 3000
```

## Documentación técnica

Setup local, variables de entorno, migraciones SQL, deploy y cuentas demo: **[DOCUMENTATION.md](DOCUMENTATION.md)**

Visión del producto: **[NEW_IDEA.md](NEW_IDEA.md)**

## Arquitectura

```
apps/web/     → Next.js (landing, portales, BFF)
apps/api/     → FastAPI (agentes, registro, admin, motor de riesgo)
supabase/     → SQL schema + RLS (solo seed UTB)
scripts/      → Seeds, cron demo, ML baseline
```
