'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bolt,
  BookOpen,
  Brain,
  Download,
  Heart,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { Spinner } from '@/components/ui';
import { Reveal } from '@/components/front/reveal';
import { proxyJson } from '@/lib/proxy';

interface TwinProfile {
  interests: string[];
  learning_style: string;
  emotional_baseline: string;
  summary_text: string;
  traits: Record<string, number>;
}

const TRAIT_META: Record<
  string,
  { title: string; icon: typeof Users; iconBg: string; iconColor: string; barColor: string; valueColor: string }
> = {
  social: {
    title: 'Indicador Social',
    icon: Users,
    iconBg: 'bg-blue-100 dark:bg-primary/20',
    iconColor: 'text-primary',
    barColor: 'bg-primary',
    valueColor: 'text-primary',
  },
  motivacion: {
    title: 'Motivación',
    icon: Bolt,
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconColor: 'text-amber-700 dark:text-amber-300',
    barColor: 'bg-amber-500',
    valueColor: 'text-amber-700 dark:text-amber-300',
  },
  motivation: {
    title: 'Motivación',
    icon: Bolt,
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconColor: 'text-amber-700 dark:text-amber-300',
    barColor: 'bg-amber-500',
    valueColor: 'text-amber-700 dark:text-amber-300',
  },
  resiliencia: {
    title: 'Resiliencia',
    icon: Brain,
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-700 dark:text-indigo-300',
    barColor: 'bg-indigo-600',
    valueColor: 'text-indigo-700 dark:text-indigo-300',
  },
  resilience: {
    title: 'Resiliencia',
    icon: Brain,
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-700 dark:text-indigo-300',
    barColor: 'bg-indigo-600',
    valueColor: 'text-indigo-700 dark:text-indigo-300',
  },
};

function traitMeta(key: string) {
  const normalized = key.toLowerCase().replace(/\s+/g, '_');
  return (
    TRAIT_META[normalized] || {
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      icon: Sparkles,
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-primary',
      barColor: 'bg-primary',
      valueColor: 'text-primary',
    }
  );
}

export default function TwinSummaryPage() {
  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proxyJson<TwinProfile | null>('/psychometric/twin')
      .then(setTwin)
      .catch(() => setTwin(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center gap-3 px-5 pt-24 text-on-surface-variant">
        <Spinner /> Cargando tu Digital Twin…
      </main>
    );
  }

  if (!twin?.summary_text) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center space-y-6 px-5 pt-24 text-center">
        <Brain className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Tu Digital Twin</h1>
        <p className="text-on-surface-variant">
          Completa la encuesta de caracterización para generar tu perfil personalizado.
        </p>
        <Link
          href="/student/onboarding/survey"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:shadow-lg active:scale-95"
        >
          Comenzar encuesta
        </Link>
      </main>
    );
  }

  const traits = Object.entries(twin.traits || {});

  return (
    <main className="min-h-screen px-5 pb-24 pt-24 md:px-12 md:pb-12">
      <Reveal className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <span className="mb-4 inline-block rounded-full bg-primary-fixed px-3 py-1 text-sm font-semibold uppercase tracking-wider text-on-primary-fixed-variant">
            Tu Proyección Académica
          </span>
          <h1 className="text-balance text-4xl font-bold leading-tight text-primary md:text-5xl">
            Mi Digital Twin
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-on-surface-variant">
            Visualiza tu perfil psicopedagógico y emocional en tiempo real. Esta representación
            digital te ayuda a identificar fortalezas y áreas de oportunidad para optimizar tu
            camino universitario.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:shadow-lg active:scale-95"
        >
          <Download className="h-5 w-5" />
          Descargar Informe
        </button>
      </Reveal>

      <div className="mb-6">
        <PrivacyBanner message="Este perfil es confidencial. El personal UTB solo puede verlo si activas el consentimiento en tu perfil." />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Reveal className="glass-card flex flex-col overflow-hidden rounded-3xl md:col-span-4">
          <div className="relative h-64">
            <Image
              src="/front/student-mateo.png"
              alt="Foto de perfil del estudiante"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-primary/85 to-transparent p-6">
              <h3 className="text-2xl font-semibold text-white">Tu perfil UTB</h3>
              <p className="text-sm font-medium text-white/80">
                Estilo: {twin.learning_style || 'Mixto'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between border-b border-outline-variant/20 py-2">
              <span className="text-on-surface-variant">Estado Académico</span>
              <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-800 dark:bg-green-500/20 dark:text-green-300">
                ACTIVO
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/20 py-2">
              <span className="text-on-surface-variant">Intereses</span>
              <span className="font-bold text-primary">{(twin.interests || []).length || 0}</span>
            </div>
            <Link
              href="/student/profile"
              className="mt-2 w-full rounded-xl border border-primary/20 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Editar Perfil
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-8">
          <Reveal className="glass-card rounded-3xl p-8 shadow-sm sm:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <h4 className="text-xl font-semibold">Resumen de tu Twin</h4>
            </div>
            <p className="leading-relaxed text-on-surface">{twin.summary_text}</p>
          </Reveal>

          <Reveal className="glass-card rounded-3xl p-8 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <h4 className="text-xl font-semibold">Estilo de aprendizaje</h4>
            </div>
            <p className="text-2xl font-semibold capitalize text-on-surface">
              {twin.learning_style || 'Mixto'}
            </p>
          </Reveal>

          <Reveal delay={80} className="glass-card rounded-3xl p-8 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Heart className="h-5 w-5" />
              <h4 className="text-xl font-semibold">Perfil emocional</h4>
            </div>
            <p className="text-sm leading-snug text-on-surface-variant">
              {twin.emotional_baseline || 'Sin dato aún'}
            </p>
          </Reveal>

          {traits.map(([key, val], i) => {
            const meta = traitMeta(key);
            const Icon = meta.icon;
            const value = Math.max(0, Math.min(100, Number(val) || 0));
            return (
              <Reveal
                key={key}
                delay={120 + i * 80}
                className="glass-card flex flex-col justify-between rounded-3xl p-8 shadow-sm transition-transform hover:-translate-y-1"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className={`rounded-2xl p-3 ${meta.iconBg} ${meta.iconColor}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className={`text-2xl font-bold ${meta.valueColor}`}>{value}%</span>
                </div>
                <div>
                  <h4 className="mb-2 text-xl font-semibold text-on-surface">{meta.title}</h4>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className={`progress-fill h-full rounded-full ${meta.barColor}`}
                      data-width={`${value}%`}
                      style={{ width: 0 }}
                    />
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal
            delay={240}
            className="flex flex-col items-center justify-center rounded-3xl bg-primary p-8 text-center text-on-primary shadow-xl"
          >
            <Wand2 className="mb-4 h-12 w-12" />
            <h4 className="mb-2 text-xl font-semibold">Sugerencia de IA</h4>
            <p className="mb-6 text-sm opacity-90">
              Basado en tu Digital Twin, explora oportunidades y conversa con tu compañero
              académico.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/student/twin/chat"
                className="rounded-full bg-white px-6 py-2 font-bold text-primary transition-transform hover:scale-105"
              >
                Hablar con mi Twin
              </Link>
              <Link
                href="/student/opportunities"
                className="rounded-full border border-white/40 px-6 py-2 font-bold text-white transition-transform hover:scale-105"
              >
                Ver oportunidades
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
