'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-brand-bg pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#003A70_0%,_transparent_55%)] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_#4A90C2_0%,_transparent_45%)] opacity-20" />
      <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-brand-amber/40 to-transparent" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-amber/40 bg-brand-amber/10 px-4 py-1.5 text-xs font-medium text-brand-amber">
            <Sparkles className="h-3.5 w-3.5" /> UTB Te acompaña · Microservicio 2026
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Acompañamiento inteligente para{' '}
            <span className="text-gradient-accent">prevenir la deserción</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Digital Twin, oportunidades personalizadas y apoyo emocional para estudiantes UTB.
            Panel de riesgo e intervenciones para el personal institucional.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="/register/student" size="lg">
              Soy estudiante <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button href="/register/institutional" variant="secondary" size="lg">
              Acceso institucional
            </Button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="rounded-sm border border-brand-border bg-brand-surface p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Retención', value: '87.5%', color: 'text-green-600' },
                { label: 'Satisfacción', value: '4.2/5', color: 'text-brand-amber' },
                { label: 'Matrícula', value: '12,450', color: 'text-brand-blue-mid' },
                { label: 'Investigación', value: '156', color: 'text-brand-blue-light' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-sm border border-brand-border bg-brand-bg p-4">
                  <p className="text-xs text-muted">{kpi.label}</p>
                  <p className={`mt-1 text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted">* Datos demo — KPIs institucionales UTB</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function ProblemSolutionNarrative() {
  const cols = [
    { title: 'El problema', desc: 'Estudiantes en riesgo de deserción sin detección temprana ni acompañamiento personalizado.', accent: 'border-red-500/50' },
    { title: 'La solución', desc: 'Digital Twin, encuesta psicométrica, oportunidades y panel institucional de riesgo UTB.', accent: 'border-brand-amber' },
    { title: 'El resultado', desc: 'Intervención proactiva, mejor retención y experiencia centrada en el estudiante.', accent: 'border-brand-blue' },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-16 text-center text-4xl font-bold text-brand-blue">De la fragmentación al insight</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {cols.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-sm border-t-4 ${c.accent} border border-brand-border bg-brand-surface p-8`}
            >
              <h3 className="font-display text-xl font-semibold text-brand-blue">{c.title}</h3>
              <p className="mt-4 leading-relaxed text-muted">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ModuleBentoGrid() {
  const modules = [
    { name: 'Portal Estudiante', desc: 'Chat IA, rutas, tutor RAG' },
    { name: 'Analítica', desc: 'Dashboards por facultad' },
    { name: 'Predicción', desc: 'Modelos de retención demo' },
    { name: 'Documental', desc: 'Gestión documental scaffold' },
    { name: 'Resumen Ejecutivo', desc: 'Informes para directivos' },
    { name: 'Acciones', desc: 'Recomendaciones institucionales' },
    { name: 'Director de IA', desc: 'Asistente ejecutivo con KPIs' },
  ];
  return (
    <section id="modulos" className="bg-brand-bg py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-4 text-4xl font-bold text-brand-blue">Módulos de la plataforma</h2>
        <p className="mb-12 max-w-2xl text-muted">Siete capacidades integradas en un ecosistema institucional UTB.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <div
              key={m.name}
              className={`rounded-sm border border-brand-border bg-brand-surface p-6 transition-colors hover:border-brand-blue-mid/50 hover:shadow-sm ${i === 0 ? 'lg:col-span-2 lg:row-span-1' : ''}`}
            >
              <h3 className="font-semibold text-brand-blue">{m.name}</h3>
              <p className="mt-2 text-sm text-muted">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ExperienceShowcase() {
  return (
    <section id="experiencias" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-12 text-center text-4xl font-bold text-brand-blue">Dos experiencias, una plataforma</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-sm border border-brand-amber/40 bg-brand-surface p-8">
            <h3 className="text-xl font-semibold text-brand-amber">Estudiantes</h3>
            <ul className="mt-4 space-y-2 text-muted">
              <li>• Chat tutor IA con historial persistente</li>
              <li>• Rutas de aprendizaje personalizadas</li>
              <li>• Buscador y tutor RAG contextual</li>
              <li>• Progreso y biblioteca de recursos</li>
            </ul>
            <Button href="/register/student" className="mt-6" size="sm">Registrarse como estudiante</Button>
          </div>
          <div className="rounded-sm border border-brand-blue/30 bg-brand-surface p-8">
            <h3 className="text-xl font-semibold text-brand-blue">Directivos</h3>
            <ul className="mt-4 space-y-2 text-muted">
              <li>• 5 módulos analíticos con scope por rol</li>
              <li>• Director de IA con insights ejecutivos</li>
              <li>• Panel admin: solicitudes y auth-keys</li>
              <li>• Seguridad OWASP con alertas en tiempo real</li>
            </ul>
            <Button href="/register/institutional" variant="secondary" className="mt-6" size="sm">Registro institucional</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function KpiCarousel() {
  const kpis = [
    { name: 'Retención estudiantil', value: '87.5%', trend: '+2.1%' },
    { name: 'Graduación', value: '72.3%', trend: '+1.4%' },
    { name: 'Satisfacción', value: '4.2/5', trend: '+0.3' },
    { name: 'Ejecución presupuestal', value: '94.8%', trend: '+3.2%' },
  ];
  return (
    <section className="bg-brand-bg py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display mb-2 text-4xl font-bold text-brand-blue">KPIs institucionales</h2>
        <p className="mb-10 text-sm text-muted">* Vista previa con datos demo UTB</p>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kpis.map((k) => (
            <div key={k.name} className="min-w-[220px] flex-shrink-0 rounded-sm border border-brand-border bg-brand-surface p-6">
              <p className="text-sm text-muted">{k.name}</p>
              <p className="mt-2 text-3xl font-bold text-brand-blue">{k.value}</p>
              <p className="mt-1 text-sm text-green-600">{k.trend}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-brand-blue py-24 text-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-4xl font-bold">Comienza hoy</h2>
        <p className="mt-4 text-brand-blue-light">Regístrate, vincula tu institución y accede tras aprobación del administrador.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button href="/register/student" size="lg">Registro estudiante</Button>
          <Button href="/register/institutional" variant="secondary" size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
            Registro institucional
          </Button>
          <Button href="/login" variant="ghost" size="lg" className="text-white hover:bg-white/10">
            Ya tengo cuenta
          </Button>
        </div>
      </div>
    </section>
  );
}
