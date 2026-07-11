export const HERO_KEYWORDS = ['deserción', 'acompañamiento', 'futuro'] as const;

export const PARTICLE_SEEDS = [
  { size: 28, left: 8, top: 12, speed: 0.35, delay: 0 },
  { size: 42, left: 72, top: 8, speed: 0.55, delay: 0.2 },
  { size: 22, left: 45, top: 22, speed: 0.4, delay: 0.4 },
  { size: 36, left: 18, top: 55, speed: 0.5, delay: 0.1 },
  { size: 24, left: 85, top: 38, speed: 0.45, delay: 0.6 },
  { size: 48, left: 58, top: 68, speed: 0.6, delay: 0.3 },
  { size: 20, left: 32, top: 78, speed: 0.3, delay: 0.8 },
  { size: 34, left: 92, top: 72, speed: 0.5, delay: 0.5 },
  { size: 26, left: 5, top: 42, speed: 0.38, delay: 0.7 },
  { size: 40, left: 62, top: 15, speed: 0.48, delay: 0.15 },
  { size: 30, left: 38, top: 48, speed: 0.42, delay: 0.9 },
  { size: 18, left: 78, top: 58, speed: 0.32, delay: 1.0 },
] as const;

export const KPI_DATA = [
  { label: 'Retención', value: '87.5%', color: 'text-green-600' },
  { label: 'Satisfacción', value: '4.2/5', color: 'text-brand-amber' },
  { label: 'Matrícula', value: '12,450', color: 'text-brand-blue-mid' },
  { label: 'Investigación', value: '156', color: 'text-brand-blue-light' },
] as const;

export const PROBLEM_SOLUTION_SLIDES = [
  {
    title: 'El problema',
    desc: 'Estudiantes en riesgo de deserción sin detección temprana ni acompañamiento personalizado.',
    accent: 'border-red-500/50',
    gradient: 'from-red-500/10 to-brand-blue/5',
  },
  {
    title: 'La solución',
    desc: 'Digital Twin, encuesta psicométrica, oportunidades y panel institucional de riesgo UTB.',
    accent: 'border-brand-amber',
    gradient: 'from-brand-amber/15 to-brand-blue/5',
  },
  {
    title: 'El resultado',
    desc: 'Intervención proactiva, mejor retención y experiencia centrada en el estudiante.',
    accent: 'border-brand-blue',
    gradient: 'from-brand-blue/15 to-brand-amber/10',
  },
] as const;

export const MODULES = [
  { id: '1', name: 'Portal Estudiante', desc: 'Chat IA, rutas, tutor RAG' },
  { id: '2', name: 'Analítica', desc: 'Dashboards por facultad' },
  { id: '3', name: 'Predicción', desc: 'Modelos de retención demo' },
  { id: '4', name: 'Documental', desc: 'Gestión documental scaffold' },
  { id: '5', name: 'Resumen Ejecutivo', desc: 'Informes para directivos' },
  { id: '6', name: 'Acciones', desc: 'Recomendaciones institucionales' },
  { id: '7', name: 'Director de IA', desc: 'Asistente ejecutivo con KPIs' },
] as const;

export const INSTITUTIONAL_KPIS = [
  { name: 'Retención estudiantil', value: '87.5%', trend: '+2.1%' },
  { name: 'Graduación', value: '72.3%', trend: '+1.4%' },
  { name: 'Satisfacción', value: '4.2/5', trend: '+0.3' },
  { name: 'Ejecución presupuestal', value: '94.8%', trend: '+3.2%' },
] as const;
