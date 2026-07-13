'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui';
import { MetricCard } from '@/components/portal/MetricCard';
import { PortalCard } from '@/components/portal/PortalCard';
import { StaggerList, StaggerItem } from '@/components/portal/StaggerList';
import { proxyJson } from '@/lib/proxy';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Dashboard {
  kpis: { metric_name: string; metric_value: number; metric_unit?: string; period?: string }[];
  charts: {
    enrollment_trend?: { label: string; value: number }[];
    engagement?: { label: string; value: number }[];
  };
  cohort_alerts?: { program: string; semester: number | null; count: number; alto: number; moderado: number }[];
}

const COLORS = ['#F28C28', '#003A70', '#4A90C2', '#71717a'];

const KPI_LABELS: Record<string, string> = {
  enrollment: 'Matriculados',
  active_users_7d: 'Activos Digital Twin (7d)',
  avg_risk_score: 'Riesgo promedio',
  retention_rate: 'Retención proyectada',
  chat_sessions: 'Sesiones de chat',
  messages_total: 'Mensajes totales',
  psychometric_completed: 'Encuestas completadas',
  resources_saved: 'Recursos guardados',
  avg_progress: 'Progreso promedio',
  at_risk_students: 'Estudiantes en riesgo',
  inactive_twin_7d: 'Inactivos en Twin (7d)',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    proxyJson<Dashboard>('/institutional/analytics/dashboard').then(setData).catch(() => setData(null));
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Analítica institucional</h1>
        <LoadingState />
      </div>
    );
  }

  const enrollmentTrend = data.charts.enrollment_trend ?? [];
  const engagement = data.charts.engagement ?? [];
  const cohorts = data.cohort_alerts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Analítica institucional</h1>
          <p className="text-muted">KPIs de acompañamiento y prevención de deserción — UTB</p>
        </div>
        <Link href="/institutional/prediction" className="text-sm text-[var(--portal-accent)] hover:underline">
          Ver predicción →
        </Link>
      </div>

      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <StaggerItem key={k.metric_name}>
            <MetricCard
              label={KPI_LABELS[k.metric_name] || k.metric_name.replace(/_/g, ' ')}
              value={String(k.metric_value)}
              trend={k.metric_unit}
            />
          </StaggerItem>
        ))}
      </StaggerList>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortalCard className="min-h-[280px]">
          <p className="mb-4 font-medium">Matriculación y riesgo</p>
          {enrollmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={enrollmentTrend}>
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#F28C28" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm">Sin datos</p>
          )}
        </PortalCard>
        <PortalCard className="min-h-[280px]">
          <p className="mb-4 font-medium">Engagement</p>
          {engagement.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={engagement} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                  {engagement.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm">Sin datos</p>
          )}
        </PortalCard>
      </div>

      {cohorts.length > 0 && (
        <PortalCard>
          <h2 className="font-semibold mb-3">Cohortes en riesgo</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left">
                  <th className="py-2 pr-4">Programa</th>
                  <th className="py-2 pr-4">Semestre</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Alto</th>
                  <th className="py-2">Moderado</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={`${c.program}-${c.semester}`} className="border-b border-brand-border/50">
                    <td className="py-2 pr-4">{c.program}</td>
                    <td className="py-2 pr-4">{c.semester ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium">{c.count}</td>
                    <td className="py-2 pr-4 text-red-400">{c.alto}</td>
                    <td className="py-2 text-amber-400">{c.moderado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PortalCard>
      )}
    </div>
  );
}
