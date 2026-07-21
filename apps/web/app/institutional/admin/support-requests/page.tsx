'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, LoadingState, EmptyState, Input, Label, Select } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { LifeBuoy } from 'lucide-react';

interface SupportRequest {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  student_name?: string;
  student_email?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  resolved: 'Resuelta',
};

export default function SupportRequestsPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const qs = params.toString();
    const data = await proxyJson<SupportRequest[]>(
      `/institutional/support-requests${qs ? `?${qs}` : ''}`
    );
    setRequests(Array.isArray(data) ? data : []);
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      load().finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    try {
      await proxyJson(`/institutional/support-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch {
      // Keep list; finally clears updating flag.
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Solicitudes de apoyo humano</h1>
        <p className="text-muted">Estudiantes que pidieron contacto desde el Digital Twin</p>
      </div>

      <PortalCard className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Estado</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="assigned">Asignada</option>
            <option value="resolved">Resuelta</option>
          </Select>
        </div>
        <div>
          <Label>Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o motivo..." />
        </div>
      </PortalCard>

      {loading ? (
        <LoadingState rows={3} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-8 w-8" />}
          title="Sin solicitudes"
          description="No hay solicitudes de apoyo que coincidan con los filtros."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <PortalCard key={r.id} className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <Link
                  href={`/institutional/students/${r.user_id}`}
                  className="font-medium text-[var(--portal-accent)] hover:underline"
                >
                  {r.student_name || r.student_email || 'Estudiante'}
                </Link>
                <p className="text-sm">{r.reason}</p>
                <p className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[r.status] || ''}`}>
                  {STATUS_LABELS[r.status] || r.status}
                </span>
                {r.status === 'pending' && (
                  <Button size="sm" disabled={updating === r.id} onClick={() => updateStatus(r.id, 'assigned')}>
                    Asignar
                  </Button>
                )}
                {r.status !== 'resolved' && (
                  <Button size="sm" variant="secondary" disabled={updating === r.id} onClick={() => updateStatus(r.id, 'resolved')}>
                    Resolver
                  </Button>
                )}
              </div>
            </PortalCard>
          ))}
        </div>
      )}
    </div>
  );
}
