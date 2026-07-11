'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { MarkdownMessage } from '@/components/ui/MarkdownMessage';
import { proxyJson } from '@/lib/proxy';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Dashboard {
  kpis: { metric_name: string; metric_value: number; metric_unit?: string }[];
  charts: {
    enrollment_trend?: { label: string; value: number }[];
    engagement?: { label: string; value: number }[];
  };
}

const COLORS = ['#003A70', '#F28C28', '#4A90C2', '#6366F1'];

export default function ExecutiveSummaryPage() {
  const [insights, setInsights] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [dash, dir] = await Promise.all([
        proxyJson<Dashboard>('/institutional/dashboard'),
        proxyJson<{ insights: string }>('/institutional/director/chat', { method: 'POST' }),
      ]);
      setDashboard(dash);
      setInsights(dir.insights || '');
    } catch {
      setInsights('No se pudo generar el resumen. Intente más tarde.');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const enrollment = dashboard?.charts?.enrollment_trend ?? [];
  const engagement = dashboard?.charts?.engagement ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Resumen ejecutivo</h1>
          <p className="text-muted">Análisis institucional UTB con KPIs en tiempo real</p>
        </div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? 'Generando…' : 'Regenerar análisis'}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PortalCard>
          <h2 className="font-semibold mb-3">Insights del Director de IA</h2>
          {insights ? (
            <MarkdownMessage content={insights} className="text-muted" />
          ) : (
            <p className="text-muted">Cargando resumen…</p>
          )}
        </PortalCard>

        <div className="space-y-4">
          <PortalCard className="min-h-[200px]">
            <p className="mb-3 font-medium">KPIs clave</p>
            <ul className="space-y-2 text-sm">
              {(dashboard?.kpis || []).slice(0, 6).map((k) => (
                <li key={k.metric_name} className="flex justify-between border-b border-brand-border/50 pb-1">
                  <span className="text-muted capitalize">{k.metric_name.replace(/_/g, ' ')}</span>
                  <span className="font-semibold">{k.metric_value}{k.metric_unit ? ` ${k.metric_unit}` : ''}</span>
                </li>
              ))}
            </ul>
          </PortalCard>

          {enrollment.length > 0 && (
            <PortalCard className="min-h-[220px]">
              <p className="mb-3 font-medium">Matriculación</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={enrollment}>
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#003A70" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </PortalCard>
          )}

          {engagement.length > 0 && (
            <PortalCard className="min-h-[220px]">
              <p className="mb-3 font-medium">Engagement</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={engagement} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={60} label>
                    {engagement.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </PortalCard>
          )}
        </div>
      </div>
    </div>
  );
}
