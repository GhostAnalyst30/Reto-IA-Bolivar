# UTB Te acompaña — Visión del producto

Microservicio de acompañamiento estudiantil de la **Universidad Tecnológica de Bolívar (UTB)**. Los usuarios se registran con correo `@utb.edu.co`, nombre de usuario y contraseña; el login es por **usuario + contraseña**.

## Alcance funcional

### Estudiante
- Registro con `@utb.edu.co`, username único y contraseña
- Vinculación a institución (UTB)
- Encuesta psicométrica (10 preguntas) → perfil Digital Twin
- Resumen del twin, chat de acompañamiento emocional
- Oportunidades (becas, convocatorias, eventos) con match
- Recursos de autoayuda y bienestar
- Rutas de aprendizaje, tutor RAG, progreso académico
- Perfil y consentimiento de privacidad del twin

### Directivos institucionales
- Registro con `@utb.edu.co` + **auth_key** activa generada por el admin
- Login: username + contraseña (+ auth_key en registro)
- Dashboard, analítica, predicción, riesgo estudiantil
- Detalle por estudiante, intervenciones
- Director de IA (asistente ejecutivo con KPIs)

### Admin institucional (gestor UTB)
- Aprobar solicitudes de registro
- Generar y revocar `auth_key` para directivos
- Gestionar programas y contenido
- Seguridad y sesiones

### Platform admin
- Username: `admin`
- Email: `ascendraemmanuel@gmail.com`
- Crear instituciones, ver usuarios globales

## Fuera de alcance (eliminado o diferido)

- Orientación vocacional independiente (fusionada en encuesta psicométrica)
- Branding «Bolívar IA» / dominios `@bolivar.ia.com`
- Integración ERP institucional (modo demo en scaffolds)
- Grafo de oportunidades interactivo (placeholder)

## Identidad visual

Ver [docs/DESIGN-UTB.md](docs/DESIGN-UTB.md): paleta UTB (#003A70, #F28C28, etc.), Newsreader + DM Sans, tarjetas con esquinas rectas (`rounded-sm`).

## Stack

Next.js 14 · FastAPI · Supabase · OpenRouter · Brevo
