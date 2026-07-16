'use client';

import Link from 'next/link';
import { LoadingState } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { useProxyJson } from '@/lib/use-proxy-json';

interface Action {
  title: string;
  priority: string;
  status: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
};

export default function ActionsPage() {
  const { data, error, isLoading } = useProxyJson<Action[]>('/institutional/actions');
  const actions = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Acciones sugeridas</h1>
        <p className="text-muted">Recomendaciones automáticas para prevenir deserción en UTB</p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : actions.length === 0 ? (
        <PortalCard>
          <p className="text-muted">No hay acciones pendientes. El monitoreo está al día.</p>
        </PortalCard>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => (
            <PortalCard key={a.title} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted mt-1">
                  Estado: {STATUS_LABELS[a.status] || a.status}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs capitalize ${PRIORITY_STYLES[a.priority] || ''}`}>
                {a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Media' : 'Baja'}
              </span>
            </PortalCard>
          ))}
        </div>
      )}

      <p className="text-sm text-muted">
        Priorice estudiantes en el{' '}
        <Link href="/institutional/risk" className="text-[var(--portal-accent)] hover:underline">
          reporte de riesgo
        </Link>
        .
      </p>
    </div>
  );
}
