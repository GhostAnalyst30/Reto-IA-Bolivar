# Design System UTB — Acompañamiento Estudiantil

## Paleta institucional

| Token | HEX | Uso |
|-------|-----|-----|
| `--utb-blue` | `#003A70` | Primario, headers, sidebar activo |
| `--utb-blue-mid` | `#005B96` | Botones secundarios, links |
| `--utb-blue-light` | `#4A90C2` | Fondos secundarios |
| `--utb-orange` | `#F28C28` | CTA, acentos, badges match |
| `--utb-gray-light` | `#F2F2F2` | Cards light mode |
| `--privacy` | `#6366F1` | Banners de confidencialidad |

Dark mode mantiene `--bg: #0A0A0B` con acentos naranja/azul UTB.

## Tipografía

- **Display:** Newsreader — títulos de módulo
- **UI:** DM Sans — cuerpo, formularios, tablas

## Componentes clave

- `PrivacyBanner` — módulos sensibles (encuesta, Digital Twin, detalle institucional)
- `OpportunityCard` — beca/convocatoria/evento con deadline y match %
- `RiskBadge` — bajo (verde), moderado (ámbar), alto (rojo)
- `TwinSummaryCard` — intereses, estilo aprendizaje, perfil emocional

## Patrones UX

1. **Onboarding:** registro → vincular institución → encuesta 10Q → resumen Digital Twin
2. **Navegación estudiante:** Perfil | Oportunidades | Recursos | Digital Twin | Aprendizaje (colapsable)
3. **Navegación institucional:** Dashboard | Riesgo | Estudiantes | Contenido | Admin
4. **Privacidad:** checkbox consentimiento antes de compartir twin con personal

## Wireframes (texto)

### Encuesta psicométrica
Barra progreso 1/10 → pregunta Likert 1-5 → aviso confidencial fijo abajo.

### Oportunidades
Filtros horizontales + grid cards + sección "Recomendaciones para ti" arriba.

### Digital Twin chat
Layout 2 columnas: chat izquierda, autoayuda derecha; botón "Solicitar apoyo humano" sticky.

### Tabla riesgo
Tabla sorteable: nombre | programa | riesgo | factores | acción "Ver detalle".
