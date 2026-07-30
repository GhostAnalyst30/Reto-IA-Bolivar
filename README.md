# UTB Te acompaña

Plataforma de acompañamiento estudiantil enfocada en prevención de deserción para la **Universidad Tecnológica de Bolívar (UTB)**. Integra Digital Twin, motor de riesgo explicable, orientación vocacional con red neuronal visual, apoyo humano y herramientas institucionales.

## Funcionalidades

### Portal estudiante

| Módulo | Descripción |
|--------|-------------|
| **Encuesta de caracterización** | 20 preguntas (Likert + elección) para perfilar intereses, estilo de aprendizaje, bienestar y metas académicas. |
| **Digital Twin** | Perfil determinístico generado a partir de la encuesta (intereses, estilo, línea base emocional, rasgos) y resumen personalizado del estudiante. |
| **Chat Digital Twin** | Acompañamiento empático con IA, historial persistente, contexto del perfil y derivación automática a psicología ante crisis o solicitud de ayuda profesional. |
| **Test vocacional** | Cuestionario adaptativo en árbol binario (~36 nodos) que explora afinidades por dominios académicos. |
| **Red neuronal de programas** | Visualización interactiva tipo red neuronal (`NeuralProgramGraph`): capas de rasgos → capa oculta → programas UTB, con activación animada y afinidad por pregrado. |
| **Matcher de programas** | Motor híbrido que combina caracterización, vocacional y chat; puntúa programas por dominios y embeddings semánticos (pgvector). |
| **Oportunidades** | Becas, convocatorias y eventos con match personalizado, filtros y guardado de favoritos. |
| **Recursos de apoyo** | Catálogo de videos, enlaces y materiales de bienestar y vida universitaria. |
| **Progreso y perfil** | Seguimiento de avance, consentimiento de privacidad (`twin_consent`) y preferencias de contacto. |
| **Agendamiento psicología** | Solicitud de cita con psicólogo UTB desde el flujo de chat o apoyo humano. |

### Portal institucional

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en vivo: matrícula, usuarios activos, riesgo promedio, retención proyectada, encuestas completadas y estudiantes en riesgo. |
| **Analítica** | Gráficos de matriculación, actividad, engagement y distribución por programa/facultad. |
| **Riesgo de deserción** | Motor heurístico 0–100 con factores ponderados explicables (inactividad, encuesta incompleta, progreso, ánimo, apoyo pendiente) y causa dominante. |
| **Predicción ML** | Regresión logística sobre puntaje de riesgo para estimar probabilidad de deserción; fallback heurístico si no hay modelo entrenado. |
| **CareQueue** | Cola unificada de intervención con prioridad, urgencia (crítica/alta/media/baja), SLA (4/24/48/72 h) y resumen de caso para el psicólogo. |
| **Acciones e intervenciones** | Planes de acción sugeridos por causa dominante y seguimiento de tickets. |
| **Resumen ejecutivo** | Informes situacionales generados con IA a partir de KPIs institucionales. |
| **Chat institucional** | Asistente con datos agregados (sin PII individual) para consultas de directivos y personal autorizado. |
| **Director de IA** | Vista ejecutiva con indicadores clave y narrativa de apoyo a la toma de decisiones. |
| **Detalle de estudiante** | Historial de riesgo, Digital Twin (con consentimiento), factores y línea de tiempo de atención. |
| **Inbox bienestar** | Bandeja del psicólogo para responder en el mismo hilo de chat del estudiante (handoff humano). |
| **Citas psicología** | Confirmación, rechazo y gestión de solicitudes de cita. |
| **Administración** | Usuarios, solicitudes de registro, oportunidades, recursos, estados académicos, claves de rol y panel de seguridad. |

### Inteligencia artificial y modelos

- **Digital Twin determinístico** — perfil generado con reglas explícitas, sin LLM (`twin_agent`).
- **Chat empático** — agente conversacional con streaming SSE, contexto del perfil y recursos de autoayuda.
- **Red neuronal visual** — grafo animado de afinidad vocacional: rasgos del estudiante → capa oculta → programas académicos UTB.
- **Matcher anti-sesgo** — normalización de pesos por dominio; estilos de aprendizaje desacoplados de áreas profesionales.
- **Embeddings semánticos** — similitud vectorial (pgvector) para refinar recomendaciones de programas.
- **Motor de riesgo explicable** — puntaje auditable con factores, pesos y causa dominante persistidos en historial.
- **Predicción de deserción** — pipeline offline de entrenamiento (`train_dropout_model.py`) con validación cruzada.
- **Router LLM multi-proveedor** — OpenRouter con modelos gratuitos, reintentos y degradación graceful (Gemini/HuggingFace).
- **Guardrails** — detección de crisis, prompt injection, redacción de PII, bloqueo off-topic y escalamiento humano automático.
- **Resumen ejecutivo IA** — briefs institucionales generados a partir de métricas en tiempo real.

### Seguridad, privacidad y trazabilidad

- Autenticación JWT (Supabase Auth) con registro `@utb.edu.co` y aprobación administrativa.
- RBAC por rol (`student`, `admin`, `psychologist`, `platform_admin`) y Row Level Security en PostgreSQL.
- Consentimiento informado antes de compartir el Digital Twin con personal UTB.
- Eventos de seguridad auditables (`security_events`) y panel administrativo.
- Human-in-the-loop obligatorio para crisis, riesgo alto y decisiones sensibles.

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


> **Desarrolladores:**

> Emmanuel Ascendra Perez

> Susana Rosales Castellar