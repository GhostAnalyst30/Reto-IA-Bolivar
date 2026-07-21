# UTB Te acompaña

Plataforma de acompañamiento estudiantil enfocada en prevención de deserción: Digital Twin, riesgo, apoyo humano y herramientas institucionales.

## Stack

Next.js · FastAPI · Supabase · OpenRouter · Brevo

## Estructura

```
apps/web/     Frontend y BFF
apps/api/     API y agentes
supabase/     Schema y migraciones
scripts/      Utilidades de setup
```

## Inicio rápido

```bash
pnpm install
# Configura variables según DOCUMENTATION.md y los .env.example
pnpm dev:api   # :8000
pnpm dev:web   # :3000
```

## Documentación

Setup, entorno, migraciones y deploy: **[DOCUMENTATION.md](DOCUMENTATION.md)**
