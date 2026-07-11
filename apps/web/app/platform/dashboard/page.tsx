'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalCard } from '@/components/portal/PortalCard';
import { MetricCard } from '@/components/portal/MetricCard';
import { StaggerList, StaggerItem } from '@/components/portal/StaggerList';
import { proxyJson } from '@/lib/proxy';
import { ROLE_LABELS } from '@/lib/utils';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Dashboard {
  total_users: number;
  pending_requests: number;
  unlinked_users: number;
  users_by_role: Record<string, number>;
  recent_users: { full_name: string; email: string; role: string; created_at: string }[];
}

const COLORS = ['#6366F1', '#F28C28', '#003A70', '#4A90C2', '#71717a', '#22c55e'];

export default function PlatformDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    proxyJson<Dashboard>('/platform/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted p-6">Cargando dashboard...</p>;
  if (error) return <p className="text-red-500 p-6">{error}</p>;
  if (!data) return null;

  const roleData = Object.entries(data.users_by_role || {})
    .filter(([r]) => r !== 'platform_admin')
    .map(([role, value]) => ({ label: ROLE_LABELS[role] || role, value }));

  const stats = [
    { label: 'Usuarios totales', value: data.total_users, icon: Users, href: '/platform/users/students' },
    { label: 'Solicitudes pendientes', value: data.pending_requests, icon: Clock, href: '/platform/requests' },
    { label: 'Sin institución', value: data.unlinked_users, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard UTB</h1>
        <p className="text-muted">Resumen de la plataforma de acompañamiento</p>
      </div>

      <StaggerList className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            {s.href ? (
              <Link href={s.href}>
                <MetricCard label={s.label} value={String(s.value)} />
              </Link>
            ) : (
              <MetricCard label={s.label} value={String(s.value)} />
            )}
          </StaggerItem>
        ))}
      </StaggerList>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortalCard className="min-h-[280px]">
          <p className="mb-4 font-medium">Usuarios por rol</p>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">Sin datos de roles.</p>
          )}
        </PortalCard>

        <PortalCard className="min-h-[280px]">
          <p className="mb-4 font-medium">Distribución por rol (barras)</p>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleData}>
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--portal-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">Sin datos.</p>
          )}
        </PortalCard>
      </div>

      {data.recent_users?.length > 0 && (
        <PortalCard>
          <p className="mb-3 font-medium">Usuarios recientes</p>
          <ul className="space-y-2 text-sm">
            {data.recent_users.slice(0, 5).map((u, i) => (
              <li key={i} className="flex justify-between border-b border-brand-border/50 pb-2">
                <span>{u.full_name || u.email}</span>
                <span className="text-muted">{ROLE_LABELS[u.role] || u.role}</span>
              </li>
            ))}
          </ul>
        </PortalCard>
      )}
    </div>
  );
}
