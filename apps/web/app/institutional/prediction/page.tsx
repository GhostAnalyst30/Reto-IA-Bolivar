'use client';

import { LoadingState } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { useProxyJson } from '@/lib/use-proxy-json';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface HeuristicPrediction {
  retention_forecast: number;
  dropout_risk_percent: number;
  confidence: string;
  factors: string[];
}

interface MlPrediction {
  model_loaded: boolean;
  heuristic_fallback: boolean;
  students_scored: number;
  avg_dropout_probability: number;
  high_probability_count: number;
  model_meta?: { cv_accuracy_mean?: number; training_samples?: number } | null;
  top_risk: Array<{
    user_id: string;
    risk_score: number;
    risk_level?: string;
    dominant_cause?: string;
    dropout_probability: number;
  }>;
}

interface Impact {
  improved_count: number;
  worsened_count: number;
  stable_count: number;
  care_queue: {
    opened_7d: number;
    open_now: number;
    resolved_7d: number;
    contacted_within_48h: number;
    contact_rate_48h: number | null;
  };
  outcomes: Record<string, number>;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export default function PredictionPage() {
  const heuristic = useProxyJson<HeuristicPrediction>('/institutional/prediction');
  const ml = useProxyJson<MlPrediction>('/institutional/prediction/ml');
  const impact = useProxyJson<Impact>('/institutional/impact');

  const loading = heuristic.isLoading || ml.isLoading || impact.isLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Predicción e impacto</h1>
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Predicción e impacto</h1>
        <p className="text-muted">Modelo ML + trayectoria semanal de riesgo y CareQueue</p>
      </div>

      {heuristic.data && (
        <div className="grid gap-4 md:grid-cols-3">
          <PortalCard>
            <p className="text-sm text-muted">Retención proyectada (heurística)</p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-[var(--portal-accent)]">
              <TrendingUp className="h-6 w-6" />
              {heuristic.data.retention_forecast}%
            </p>
          </PortalCard>
          <PortalCard>
            <p className="text-sm text-muted">Riesgo deserción (heurística)</p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-bold text-red-400">
              <TrendingDown className="h-6 w-6" />
              {heuristic.data.dropout_risk_percent}%
            </p>
          </PortalCard>
          <PortalCard>
            <p className="text-sm text-muted">Confianza</p>
            <p className="mt-2 text-2xl font-bold capitalize">
              {CONFIDENCE_LABELS[heuristic.data.confidence] || heuristic.data.confidence}
            </p>
          </PortalCard>
        </div>
      )}

      {ml.data && (
        <PortalCard>
          <h2 className="font-semibold mb-3">DropoutPredict (ML)</h2>
          <p className="text-sm text-muted mb-4">
            {ml.data.model_loaded
              ? `Modelo cargado · CV accuracy ${((ml.data.model_meta?.cv_accuracy_mean || 0) * 100).toFixed(1)}% · n=${ml.data.model_meta?.training_samples ?? '—'}`
              : 'Sin modelo entrenado — usando fallback risk_score/100. Ejecuta scripts/train_dropout_model.py cuando haya ≥10 outcomes.'}
          </p>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div>
              <p className="text-xs text-muted">Estudiantes puntuados</p>
              <p className="text-2xl font-bold">{ml.data.students_scored}</p>
            </div>
            <div>
              <p className="text-xs text-muted">P(deserción) promedio</p>
              <p className="text-2xl font-bold">{(ml.data.avg_dropout_probability * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted">Alta probabilidad (≥50%)</p>
              <p className="text-2xl font-bold text-red-400">{ml.data.high_probability_count}</p>
            </div>
          </div>
          <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
            {(ml.data.top_risk || []).slice(0, 10).map((r) => (
              <li key={r.user_id} className="flex justify-between gap-2 border-b border-brand-border py-1">
                <span className="truncate text-muted">{r.user_id.slice(0, 8)}… · {r.dominant_cause || 'n/d'}</span>
                <span className="font-medium">{(r.dropout_probability * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </PortalCard>
      )}

      {impact.data && (
        <PortalCard>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Impacto (7 días)
          </h2>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div>
              <p className="text-xs text-muted">Mejoraron</p>
              <p className="text-2xl font-bold text-green-600">{impact.data.improved_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Empeoraron</p>
              <p className="text-2xl font-bold text-red-500">{impact.data.worsened_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Estables</p>
              <p className="text-2xl font-bold">{impact.data.stable_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Contacto CareQueue &lt;48h</p>
              <p className="text-2xl font-bold">
                {impact.data.care_queue.contact_rate_48h != null
                  ? `${Math.round(impact.data.care_queue.contact_rate_48h * 100)}%`
                  : '—'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted">
            CareQueue: {impact.data.care_queue.open_now} abiertos · {impact.data.care_queue.resolved_7d} resueltos (7d) ·{' '}
            {impact.data.care_queue.opened_7d} creados
          </p>
          {impact.data.outcomes && Object.keys(impact.data.outcomes).length > 0 && (
            <p className="mt-2 text-sm text-muted">
              Outcomes: {Object.entries(impact.data.outcomes).map(([k, v]) => `${k}=${v}`).join(' · ')}
            </p>
          )}
        </PortalCard>
      )}

      {(heuristic.error || ml.error || impact.error) && (
        <p className="text-red-500 text-sm">{heuristic.error || ml.error || impact.error}</p>
      )}
    </div>
  );
}
