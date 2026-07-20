'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { LazyMarkdownMessage } from '@/components/ui/LazyMarkdownMessage';
import { LazyBarChart, LazyPieChart } from '@/components/portal/charts/LazyCharts';
import { proxyJson } from '@/lib/proxy';
import { useProxyJson } from '@/lib/use-proxy-json';

interface Dashboard {
  kpis: { metric_name: string; metric_value: number; metric_unit?: string }[];
  charts: {
    enrollment_trend?: { label: string; value: number }[];
    engagement?: { label: string; value: number }[];
  };
}

const COLORS = ['#003A70', '#F28C28', '#4A90C2', '#6366F1'];

export default function ExecutiveSummaryPage() {
  const { data: dashboard, error: dashError, isLoading: dashLoading } = useProxyJson<Dashboard>(
    '/institutional/dashboard',
  );
  const [insights, setInsights] = useState('');
  const [insightsError, setInsightsError] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  async function loadInsights() {
    setLoadingInsights(true);
    setInsightsError('');
    try {
      const dir = await proxyJson<{ insights: string; degraded?: boolean }>(
        '/institutional/director/chat',
        { method: 'POST', soft: true },
      );
      const text =
        dir.insights ||
        'Resumen en modo limitado: revise KPIs de retención y la cola de cuidado. Genere de nuevo cuando el servicio esté disponible.';
      setInsights(text);
      if (dir.degraded && !dir.insights) {
        setInsightsError('Análisis en modo limitado.');
      }
    } catch (e) {
      setInsights(
        'Resumen en modo limitado: revise KPIs de retención y la cola de cuidado. Genere de nuevo cuando el servicio esté disponible.',
      );
      setInsightsError(e instanceof Error ? e.message : 'Análisis en modo limitado.');
    } finally {
      setLoadingInsights(false);
    }
  }

  const enrollment = dashboard?.charts?.enrollment_trend ?? [];
  const engagement = dashboard?.charts?.engagement ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Resumen ejecutivo</h1>
          <p className="text-muted">Análisis institucional UTB con KPIs en tiempo real</p>
        </div>
        <Button size="sm" onClick={loadInsights} disabled={loadingInsights}>
          {loadingInsights ? 'Generando…' : insights ? 'Regenerar análisis' : 'Generar análisis IA'}
        </Button>
      </div>

      {dashError && <p className="text-red-500">{dashError}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <PortalCard>
          <h2 className="font-semibold mb-3">Insights del Director de IA</h2>
          {insightsError && <p className="text-red-400 text-sm mb-2">{insightsError}</p>}
          {insights ? (
            <LazyMarkdownMessage content={insights} className="text-muted" />
          ) : (
            <p className="text-muted">
              {loadingInsights ? 'Generando resumen…' : 'Pulse «Generar análisis IA» para obtener insights.'}
            </p>
          )}
        </PortalCard>

        <div className="space-y-4">
          <PortalCard className="min-h-[200px]">
            <p className="mb-3 font-medium">KPIs clave</p>
            {dashLoading ? (
              <p className="text-muted text-sm">Cargando KPIs…</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(dashboard?.kpis || []).slice(0, 6).map((k) => (
                  <li key={k.metric_name} className="flex justify-between border-b border-brand-border/50 pb-1">
                    <span className="text-muted capitalize">{k.metric_name.replace(/_/g, ' ')}</span>
                    <span className="font-semibold">{k.metric_value}{k.metric_unit ? ` ${k.metric_unit}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </PortalCard>

          {enrollment.length > 0 && (
            <PortalCard className="min-h-[220px]">
              <p className="mb-3 font-medium">Matriculación</p>
              <LazyBarChart data={enrollment} fill="#003A70" height={180} />
            </PortalCard>
          )}

          {engagement.length > 0 && (
            <PortalCard className="min-h-[220px]">
              <p className="mb-3 font-medium">Engagement</p>
              <LazyPieChart data={engagement} colors={COLORS} height={180} />
            </PortalCard>
          )}
        </div>
      </div>
    </div>
  );
}
