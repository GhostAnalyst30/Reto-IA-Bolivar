# Plataforma Inteligente — Reto IA Bolívar

Plataforma educativa con **portal estudiante** (chat IA, rutas, RAG, progreso) y **suite institucional** (analítica, predicción, documental, Director de IA). Incluye administración de plataforma multi-institución, registro con aprobación, `auth_key` para roles directivos y perfiles con notificaciones por correo.

## Bolivar IA

![Landing — Bolívar IA - Oscuro](img/imagen_1.png)

![Landing — Bolívar IA - Claro](img/imagen_1_.png)

## Roles

| Rol | Acceso |
|-----|--------|
| `platform_admin` | Crear instituciones, ver todos los usuarios (`admin@bolivar.ia.com`) |
| `admin` | Gestor de una institución: solicitudes, claves, programas |
| `rector`, `dean`, etc. | Suite institucional de su universidad |
| `student` | Portal estudiante tras aprobación |

![Landing — Bolívar IA](img/imagen_3.png)

## Stack

Next.js 14 · FastAPI · Supabase (Auth + PostgreSQL + RLS) · OpenRouter · Resend

## Inicio rápido

```bash
pnpm install
# Ver DOCUMENTATION.md para variables de entorno y migraciones
pnpm dev:api   # puerto 8000
pnpm dev:web   # puerto 3000
```

## Documentación técnica

Setup local, variables de entorno, migraciones SQL, deploy y cuentas demo: **[DOCUMENTATION.md](DOCUMENTATION.md)**

## Arquitectura

```
apps/web/     → Next.js (landing, portales, BFF)
apps/api/     → FastAPI (agentes, registro, admin)
supabase/     → SQL schema + RLS
scripts/      → Seeds y utilidades
```
