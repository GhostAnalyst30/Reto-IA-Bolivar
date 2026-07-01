'use client';

import { useEffect, useState } from 'react';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { proxyJson } from '@/lib/proxy';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Dashboard {
  kpis: { metric_name: string; metric_value: number; metric_unit?: string }[];
  charts: {
    enrollment_trend: { label: string; value: number }[];
    engagement: { label: string; value: number }[];
  };
}

const COLORS = ['#C9A227', '#1A2744', '#E8D48B', '#71717a'];

export default function AnalyticsPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function load() {
      proxyJson<Dashboard>('/institutional/analytics/dashboard')
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
    }
    load();
    const onInstChange = () => {
      setData(null);
      setError('');
      load();
    };
    window.addEventListener('institution-context-changed', onInstChange);
    return () => window.removeEventListener('institution-context-changed', onInstChange);
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-zinc-500">Cargando estadísticas…</p>;
  if (data.kpis.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Analítica institucional</h1>
        <p className="text-zinc-500">
          Seleccione una institución en el selector superior para ver estadísticas, o cree una institución desde el panel de plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <h1 className="font-display mb-6 text-2xl font-bold">Analítica institucional UTB</h1>
      <BentoGrid cols={3} className="gap-4">
        {data.kpis.map((k) => (
          <BentoCell key={k.metric_name}>
            <p className="text-sm text-zinc-500 capitalize">{k.metric_name.replace(/_/g, ' ')}</p>
            <p className="mt-2 text-3xl font-bold text-brand-amber">{k.metric_value}</p>
            {k.metric_unit && <p className="text-xs text-zinc-500">{k.metric_unit}</p>}
          </BentoCell>
        ))}
        <BentoCell colSpan={2} rowSpan={2} className="min-h-[280px]">
          <p className="mb-4 font-medium">Matriculación y actividad</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.charts.enrollment_trend}>
              <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#C9A227" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </BentoCell>
        <BentoCell className="min-h-[280px]">
          <p className="mb-4 font-medium">Engagement</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.charts.engagement} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                {data.charts.engagement.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
