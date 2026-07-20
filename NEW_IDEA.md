# UTB Te acompaña — Visión del producto

Microservicio de acompañamiento estudiantil de la **Universidad Tecnológica de Bolívar (UTB)**. Los usuarios se registran con correo `@utb.edu.co` y contraseña; el login es por **correo + contraseña**.

> **UTB-only:** no hay multi-tenant. La tabla `institutions` existe por modelo de datos, pero solo se usa el seed UTB.

## Alcance funcional

### Estudiante
- Registro con `@utb.edu.co` y contraseña
- Encuesta psicométrica → perfil Digital Twin
- Resumen del twin, chat de acompañamiento emocional, mood check-ins
- Solicitud de apoyo humano desde el chat
- Oportunidades (becas, convocatorias, eventos) con match
- Recursos de autoayuda y bienestar
- Rutas de aprendizaje, tutor RAG, progreso académico
- Perfil y consentimiento de privacidad del twin

### Directivos UTB
- Registro con `@utb.edu.co` + **auth_key** activa generada por el admin
- Dashboard, analítica, predicción, riesgo de deserción, acciones sugeridas
- Detalle por estudiante con causa dominante, tendencia e intervenciones
- Chat institucional y resumen ejecutivo (Director IA)

### Admin institucional (gestor UTB)
- Aprobar solicitudes de registro
- Bandeja de solicitudes de apoyo humano
- Registrar estados académicos (activo, retirado, aplazado, graduado)
- Generar y revocar `auth_key` para directivos
- Gestionar programas, oportunidades y recursos
- Seguridad y sesiones

### Platform admin (operaciones UTB)
- Email: `ascendraemmanuel@gmail.com`
- Gestión global de usuarios y contenido UTB
- Acceso a módulos institucionales de riesgo y analítica

## Prevención de deserción — causas modeladas

| Causa | Señales en plataforma |
|-------|----------------------|
| Desengagement | Inactividad en Digital Twin (7 días) |
| Onboarding | Encuesta psicométrica incompleta |
| Académico | Bajo progreso en rutas de aprendizaje |
| Emocional | Mood bajo, estrés alto, solicitud de apoyo |
| Motivacional | Baja motivación en encuesta |
| Social | Red de apoyo limitada (encuesta) |
| Económico | Situación que requiere apoyo + becas recomendadas |

Motor de riesgo: reglas ponderadas v1.1 en `apps/api/services/risk_service.py` (no ML en producción). Script offline: `scripts/train_dropout_model.py`.

Fuera de alcance (diferido / recortado del núcleo):
- Multi-tenant
- Tutor RAG / path agent / resource scraper / director chat (deshabilitados o eliminados)
- Integración ERP completa (scaffold `academic_records`)
- Matching complejo de oportunidades (lista GET simple conservada)

## Identidad visual

Ver [docs/DESIGN-UTB.md](docs/DESIGN-UTB.md): paleta UTB (#003A70, #F28C28, etc.), Newsreader + DM Sans.

## Stack

Next.js 14 · FastAPI · Supabase · OpenRouter · Brevo
