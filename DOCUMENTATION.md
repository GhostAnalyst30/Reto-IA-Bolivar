# Documentación técnica

## Requisitos

- Node.js 18+ y pnpm
- Python 3.11+
- Proyecto Supabase
- Claves de correo (Brevo) y LLM (OpenRouter) según necesidad

## Entorno

Copia los ejemplos y completa los valores:

- `apps/web/.env.local` ← `apps/web/.env.example`
- `apps/api/.env` ← `apps/api/.env.example`

Grupos habituales: Auth/Supabase, URL de la API, LLM, correo, secretos internos (registro).

## Base de datos

Aplica el schema y los parches con el script de migraciones del repo (`scripts/run_migrations.py`). Usa `--reset` solo en entornos limpios.

## Desarrollo local

```bash
pnpm install
pnpm dev:api
pnpm dev:web
```

API en el puerto 8000; web en el 3000.

## Chat e IA

El chat del Digital Twin prueba modelos vía **LangChain** (OpenRouter → Hugging Face) con trazas opcionales en **LangSmith**. Si no obtiene respuesta, escala el hilo a un psicólogo humano (mismo chat e inbox institucional). También se puede pedir apoyo humano manualmente o por señales de crisis.

Staff (admin, psicólogo, platform admin) usa chat institucional en modo privilegiado (consulta libre de datos del sistema) con escalación humana. El resumen ejecutivo genera mensajes situacionales al entrar al módulo (LangChain + plantillas de respaldo).

Variables relevantes: `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`, `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`, `LLM_PROVIDER_ORDER`.

## Roles

Cuatro roles: `student`, `admin`, `psychologist`, `platform_admin`. Claves de rol y seguridad solo para platform admin.

## Deploy

- Web: Vercel (app en `apps/web`)
- API: servicio Python (p. ej. Render) con las mismas variables del `.env.example` de la API

No commitees secretos. Los detalles de cuentas demo o IDs de modelos viven solo en la configuración del entorno, no en este documento.
