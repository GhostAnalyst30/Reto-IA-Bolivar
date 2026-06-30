'use client';

import { useEffect, useState } from 'react';
import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Card } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<{ id?: string; metric_name: string; metric_value: number; metric_unit?: string; period?: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    proxyJson<typeof kpis>('/institutional/kpis')
      .then((data) => setKpis(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar KPIs'));
  }, []);

  return (
    <ModuleScaffold title="Analítica institucional" description="Dashboards y métricas por facultad" icon="BarChart3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k, i) => (
          <Card key={k.id || `${k.metric_name}-${k.period || i}`}>
            <p className="text-sm text-zinc-500 capitalize">{k.metric_name.replace(/_/g, ' ')}</p>
            <p className="mt-2 text-3xl font-bold text-brand-amber">{k.metric_value}</p>
            {k.metric_unit && <p className="text-xs text-zinc-600">{k.metric_unit}</p>}
          </Card>
        ))}
      </div>
    </ModuleScaffold>
  );
}
