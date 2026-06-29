'use client';

import { useEffect, useState } from 'react';
import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Card } from '@/components/ui';

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<{ metric_name: string; metric_value: number; metric_unit?: string }[]>([]);

  useEffect(() => {
    fetch('/api/proxy?path=/institutional/kpis').then((r) => r.json()).then(setKpis);
  }, []);

  return (
    <ModuleScaffold title="Analítica institucional" description="Dashboards y métricas por facultad" icon="BarChart3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.metric_name}>
            <p className="text-sm text-zinc-500 capitalize">{k.metric_name.replace(/_/g, ' ')}</p>
            <p className="mt-2 text-3xl font-bold text-brand-amber">{k.metric_value}</p>
            {k.metric_unit && <p className="text-xs text-zinc-600">{k.metric_unit}</p>}
          </Card>
        ))}
      </div>
    </ModuleScaffold>
  );
}
