'use client';

import { PortalCard } from '@/components/portal/PortalCard';
import { LazyBarChart, LazyPieChart } from '@/components/portal/charts/LazyCharts';
import { useProxyJson } from '@/lib/use-proxy-json';

interface Dashboard {
  kpis: { metric_name: string; metric_value: number; metric_unit?: string }[];
  charts: {
    enrollment_trend?: { label: string; value: number }[];
    engagement?: { label: string; value: number }[];
  };
}

interface BriefMessage {
  tone: string;
  title: string;
  body: string;
}

interface ExecutiveBrief {
  messages: BriefMessage[];
  provider?: string;
  degraded?: boolean;
  kpis?: Dashboard['kpis'];
  charts?: Dashboard['charts'];
}

const COLORS = ['#003A70', '#F28C28', '#4A90C2', '#6366F1'];

const TONE_STYLES: Record<string, string> = {
  alert: 'border-red-500/40 bg-red-500/5',
  watch: 'border-amber-500/40 bg-amber-500/5',
  ok: 'border-emerald-500/30 bg-emerald-500/5',
  info: 'border-brand-border bg-transparent',
};

export default function ExecutiveSummaryPage() {
  const { data: brief, error, isLoading } = useProxyJson<ExecutiveBrief>(
    '/institutional/executive-brief',
    { revalidateOnMount: true },
  );

  const kpis = brief?.kpis || [];
  const enrollment = brief?.charts?.enrollment_trend ?? [];
  const engagement = brief?.charts?.engagement ?? [];
  const messages = brief?.messages || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Resumen ejecutivo</h1>
        <p className="text-muted">
          Mensajes situacionales según los datos actuales (se actualizan al entrar al módulo)
        </p>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {brief?.degraded && (
        <p className="text-sm text-amber-500">
          Vista con plantillas de respaldo{brief.provider ? ` (${brief.provider})` : ''}.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && !messages.length && (
          <PortalCard>
            <p className="text-muted text-sm">Generando mensajes situacionales…</p>
          </PortalCard>
        )}
        {messages.map((m, i) => (
          <PortalCard key={`${m.title}-${i}`} className={TONE_STYLES[m.tone] || TONE_STYLES.info}>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">{m.tone}</p>
            <h2 className="font-semibold mb-2">{m.title}</h2>
            <p className="text-sm text-muted">{m.body}</p>
          </PortalCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PortalCard>
          <p className="mb-3 font-medium">KPIs clave</p>
          {isLoading && !kpis.length ? (
            <p className="text-muted text-sm">Cargando KPIs…</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {kpis.slice(0, 8).map((k) => (
                <li key={k.metric_name} className="flex justify-between border-b border-brand-border/50 pb-1">
                  <span className="text-muted capitalize">{k.metric_name.replace(/_/g, ' ')}</span>
                  <span className="font-semibold">
                    {k.metric_value}{k.metric_unit ? ` ${k.metric_unit}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        <div className="space-y-4">
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
