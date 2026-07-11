'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { PortalCard } from '@/components/portal/PortalCard';
import { StaggerList, StaggerItem } from '@/components/portal/StaggerList';
import { Brain, Sparkles, BookOpen, Heart } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface TwinProfile {
  interests: string[];
  learning_style: string;
  emotional_baseline: string;
  summary_text: string;
  traits: Record<string, number>;
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
      <div className="flex items-center gap-3 text-zinc-500">
        <Spinner /> Cargando tu Digital Twin…
      </div>
    );
  }

  if (!twin?.summary_text) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <Brain className="mx-auto h-12 w-12 text-brand-amber" />
        <h1 className="font-display text-2xl font-bold">Tu Digital Twin</h1>
        <p className="text-zinc-500">Completa la encuesta de caracterización para generar tu perfil personalizado.</p>
        <Link href="/student/onboarding/survey">
          <Button>Comenzar encuesta</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Mi Digital Twin</h1>
        <p className="text-zinc-500">Resumen de tu caracterización inicial UTB</p>
      </div>

      <PrivacyBanner message="Este perfil es confidencial. El personal UTB solo puede verlo si activas el consentimiento en tu perfil." />

      <PortalCard className="border-brand-amber/30 bg-brand-amber/5">
        <p className="text-lg leading-relaxed">{twin.summary_text}</p>
      </PortalCard>

      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StaggerItem>
          <PortalCard>
          <div className="flex items-center gap-2 text-brand-amber mb-3">
            <Sparkles className="h-5 w-5" /> Intereses
          </div>
          <ul className="space-y-1 text-sm">
            {(twin.interests || []).map((i) => (
              <li key={i} className="rounded bg-brand-bg px-2 py-1">{i}</li>
            ))}
          </ul>
          </PortalCard>
        </StaggerItem>
        <StaggerItem>
          <PortalCard>
          <div className="flex items-center gap-2 text-brand-amber mb-3">
            <BookOpen className="h-5 w-5" /> Estilo de aprendizaje
          </div>
          <p className="text-2xl font-semibold capitalize">{twin.learning_style || 'Mixto'}</p>
          </PortalCard>
        </StaggerItem>
        <StaggerItem>
          <PortalCard>
          <div className="flex items-center gap-2 text-brand-amber mb-3">
            <Heart className="h-5 w-5" /> Perfil emocional
          </div>
          <p className="text-sm text-zinc-400">{twin.emotional_baseline}</p>
          </PortalCard>
        </StaggerItem>
      </StaggerList>

      {twin.traits && Object.keys(twin.traits).length > 0 && (
        <section>
          <h2 className="mb-4 font-semibold">Indicadores</h2>
          <StaggerList className="grid gap-4 md:grid-cols-3">
            {Object.entries(twin.traits).map(([key, val]) => (
              <StaggerItem key={key}>
              <PortalCard>
                <p className="text-sm capitalize text-zinc-500">{key}</p>
                <div className="mt-2 h-2 rounded-full bg-brand-border">
                  <div className="h-2 rounded-full bg-brand-amber" style={{ width: `${val}%` }} />
                </div>
                <p className="mt-1 text-right text-sm font-medium">{val}%</p>
              </PortalCard>
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/student/twin/chat"><Button>Hablar con mi Digital Twin</Button></Link>
        <Link href="/student/opportunities"><Button variant="secondary">Ver oportunidades recomendadas</Button></Link>
        <Link href="/student/onboarding/survey"><Button variant="secondary">Repetir encuesta</Button></Link>
      </div>
    </div>
  );
}
