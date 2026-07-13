'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PortalButton } from '@/components/portal/PortalButton';
import { LoadingState } from '@/components/ui';
import { MetricCard } from '@/components/portal/MetricCard';
import { PortalCard } from '@/components/portal/PortalCard';
import { StaggerList, StaggerItem } from '@/components/portal/StaggerList';
import { proxyJson } from '@/lib/proxy';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Dashboard {
  kpis: { metric_name: string; metric_value: number; metric_unit?: string }[];
  charts: {
    enrollment_trend?: { label: string; value: number }[];
    engagement?: { label: string; value: number }[];
  };
  cohort_alerts?: { program: string; semester: number | null; count: number; alto: number; moderado: number }[];
}

const COLORS = ['#F28C28', '#003A70', '#4A90C2', '#71717a'];

export default function InstitutionalDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const router = useRouter();

  useEffect(() => {
    function load() {
      proxyJson<Dashboard>('/institutional/dashboard')
        .then(setData)
        .catch(() => setData(null));
    }
    load();
    const onInstChange = () => {
      setData(null);
      load();
    };
    window.addEventListener('institution-context-changed', onInstChange);
    return () => window.removeEventListener('institution-context-changed', onInstChange);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard UTB</h1>
          <p className="text-zinc-500">Monitoreo de acompañamiento y prevención de deserción</p>
        </div>
        <LoadingState />
      </div>
    );
  }

  if (data.kpis.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Dashboard UTB</h1>
        <p className="text-muted">
          Aún no hay datos suficientes. Registre estudiantes o use &quot;Recalcular riesgo&quot; en el módulo de deserción.
        </p>
      </div>
    );
  }

  const enrollmentTrend = data.charts.enrollment_trend ?? [];
  const engagement = data.charts.engagement ?? [];
  const atRisk = data.kpis.find((k) => k.metric_name === 'at_risk_students');
  const cohorts = data.cohort_alerts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard UTB</h1>
          <p className="text-muted">Monitoreo de acompañamiento y prevención de deserción</p>
        </div>
        <Link href="/institutional/risk">
          <PortalButton>Ver reporte de riesgo</PortalButton>
        </Link>
      </div>

      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.kpis.slice(0, 6).map((k) => (
          <StaggerItem key={k.metric_name}>
            <MetricCard
              label={k.metric_name.replace(/_/g, ' ')}
              value={String(k.metric_value)}
              trend={k.metric_unit}
            />
          </StaggerItem>
        ))}
        <StaggerItem className="sm:col-span-2">
          <PortalCard className="min-h-[260px]">
          <p className="mb-4 font-medium">Matriculación y actividad</p>
          {enrollmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={enrollmentTrend}>
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#F28C28" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">Sin datos de matriculación.</p>
          )}
          </PortalCard>
        </StaggerItem>
        <StaggerItem>
          <PortalCard className="min-h-[260px]">
          <p className="mb-4 font-medium">Engagement</p>
          {engagement.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={engagement} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={70} label>
                  {engagement.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">Sin datos de engagement.</p>
          )}
          </PortalCard>
        </StaggerItem>
      </StaggerList>

      {atRisk && Number(atRisk.metric_value) > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="font-medium text-red-600 dark:text-red-400">
            {atRisk.metric_value} estudiantes en riesgo detectados
          </p>
          <PortalButton className="mt-2" size="sm" onClick={() => router.push('/institutional/risk')}>
            Revisar casos
          </PortalButton>
        </div>
      )}

      {cohorts.length > 0 && (
        <PortalCard>
          <p className="font-medium mb-3">Cohortes en riesgo</p>
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border text-left">
                  <th className="py-2 pr-4">Programa</th>
                  <th className="py-2 pr-4">Semestre</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2">Alto / Moderado</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.slice(0, 5).map((c) => (
                  <tr key={`${c.program}-${c.semester}`} className="border-b border-brand-border/50">
                    <td className="py-2 pr-4">{c.program}</td>
                    <td className="py-2 pr-4">{c.semester ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium">{c.count}</td>
                    <td className="py-2 text-muted">{c.alto} / {c.moderado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/institutional/analytics" className="text-xs text-[var(--portal-accent)] hover:underline mt-2 inline-block">
            Ver analítica completa →
          </Link>
        </PortalCard>
      )}
    </div>
  );
}
