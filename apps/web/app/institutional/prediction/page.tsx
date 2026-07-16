'use client';

import Link from 'next/link';
import { LoadingState } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { useProxyJson } from '@/lib/use-proxy-json';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface Prediction {
  retention_forecast: number;
  dropout_risk_percent: number;
  confidence: string;
  factors: string[];
}

const CONFIDENCE_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export default function PredictionPage() {
  const { data, error, isLoading } = useProxyJson<Prediction>('/institutional/prediction');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Predicción de retención</h1>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Predicción de retención</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Predicción de retención</h1>
        <p className="text-muted">Proyección heurística basada en engagement y progreso UTB</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PortalCard>
          <p className="text-sm text-muted">Retención proyectada</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-[var(--portal-accent)]">
            <TrendingUp className="h-6 w-6" />
            {data.retention_forecast}%
          </p>
        </PortalCard>
        <PortalCard>
          <p className="text-sm text-muted">Riesgo de deserción</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-red-400">
            <TrendingDown className="h-6 w-6" />
            {data.dropout_risk_percent}%
          </p>
        </PortalCard>
        <PortalCard>
          <p className="text-sm text-muted">Confianza del modelo</p>
          <p className="mt-2 text-2xl font-bold capitalize">
            {CONFIDENCE_LABELS[data.confidence] || data.confidence}
          </p>
          <p className="mt-1 text-xs text-muted">Heurística v1 — no es ML predictivo</p>
        </PortalCard>
      </div>

      <PortalCard>
        <h2 className="font-semibold mb-3">Factores considerados</h2>
        <ul className="space-y-2 text-sm text-muted">
          {(data.factors || []).map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      </PortalCard>

      <p className="text-sm text-muted">
        Para acciones concretas, visite{' '}
        <Link href="/institutional/actions" className="text-[var(--portal-accent)] hover:underline">
          Acciones sugeridas
        </Link>{' '}
        o el{' '}
        <Link href="/institutional/risk" className="text-[var(--portal-accent)] hover:underline">
          reporte de riesgo
        </Link>
        .
      </p>
    </div>
  );
}
