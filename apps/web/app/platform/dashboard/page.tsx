'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';
import { Building2, Users, Clock, Unlink } from 'lucide-react';

interface Dashboard {
  total_users: number;
  total_institutions: number;
  active_institutions: number;
  pending_requests: number;
  unlinked_users: number;
}

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

  if (loading) return <p className="text-zinc-500">Cargando dashboard...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  const stats = [
    { label: 'Usuarios totales', value: data.total_users, icon: Users },
    { label: 'Instituciones', value: data.total_institutions, icon: Building2 },
    { label: 'Instituciones activas', value: data.active_institutions, icon: Building2 },
    { label: 'Solicitudes pendientes', value: data.pending_requests, icon: Clock },
    { label: 'Sin institución', value: data.unlinked_users, icon: Unlink },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Resumen ejecutivo</h2>
      <p className="text-sm text-zinc-500">admin@bolivar.ia.com — vista global de la plataforma</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <s.icon className="h-5 w-5 text-brand-amber" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-zinc-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
