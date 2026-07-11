export const TERMS_SECTIONS = [
  {
    id: 'seguridad',
    title: 'Uso de inteligencia artificial',
    colSpan: 2 as const,
    items: [
      'Los asistentes IA (Digital Twin, tutor RAG, Director de IA) utilizan modelos vía OpenRouter.',
      'Las respuestas son orientativas y no sustituyen asesoría académica, legal o médica profesional.',
      'No comparta datos sensibles (contraseñas, documentos de identidad completos) en el chat.',
      'El razonamiento mostrado es un resumen del proceso interno; puede omitir detalles técnicos.',
    ],
  },
  {
    id: 'datos',
    title: 'Manejo de datos',
    colSpan: 1 as const,
    items: [
      'Datos almacenados en Supabase (PostgreSQL) con cifrado en tránsito (TLS).',
      'Registro exclusivo con correo @utb.edu.co e identificador de usuario único.',
      'Row Level Security (RLS) limita el acceso por rol e institución.',
      'Correos transaccionales enviados vía Brevo a cualquier dirección registrada.',
    ],
  },
  {
    id: 'recursos',
    title: 'Recursos educativos',
    colSpan: 1 as const,
    items: [
      'Recursos indexados desde fuentes públicas (YouTube, edX, Khan Academy, etc.).',
      'Respetamos robots.txt y términos de servicio de cada fuente.',
      'Los enlaces dirigen al contenido original; UTB Te acompaña no aloja material con derechos de autor.',
    ],
  },
  {
    id: 'derechos',
    title: 'Sus derechos',
    colSpan: 2 as const,
    paragraph:
      'Puede solicitar acceso, corrección o eliminación de sus datos contactando al administrador institucional. Las cuentas pendientes de aprobación no acceden a funcionalidades completas hasta ser validadas.',
  },
] as const;
