'use client';

import { useEffect, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { Button, Card, Badge, Input } from '@/components/ui';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { ROLE_LABELS } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';
import { useProxyJson } from '@/lib/use-proxy-json';

interface Request {
  id: string;
  requested_role: string;
  created_at: string;
  users: { full_name: string; email: string };
  institutions: { name: string } | null;
}

async function clearApplicantProfileCache(userId: string | undefined) {
  if (!userId) return;
  try {
    await fetch('/api/internal/invalidate-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch {
    // Best-effort; middleware TTL will expire anyway.
  }
}

export function RequestsPanel() {
  const { data, error, isLoading, mutate } = useProxyJson<Request[] | { degraded?: boolean }>('/admin/requests');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const degraded = Boolean(data && !Array.isArray(data) && (data as { degraded?: boolean }).degraded);
  const requests = Array.isArray(data) ? data : [];

  useEffect(() => {
    const onChange = () => mutate();
    window.addEventListener('institution-context-changed', onChange);
    return () => window.removeEventListener('institution-context-changed', onChange);
  }, [mutate]);

  async function refreshRelated() {
    await mutate();
    await Promise.all([
      globalMutate('/platform/dashboard'),
      globalMutate('/admin/requests'),
    ]);
  }

  async function approve(id: string) {
    setActionLoading(true);
    setActionError('');
    try {
      const result = await proxyJson<{ status: string; user_id?: string }>(
        `/admin/requests/${id}/approve`,
        { method: 'POST', body: '{}' },
      );
      await clearApplicantProfileCache(result?.user_id);
      await refreshRelated();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  }

  async function reject(id: string) {
    setActionLoading(true);
    setActionError('');
    try {
      const result = await proxyJson<{ status: string; user_id?: string }>(
        `/admin/requests/${id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Solicitud no aprobada' }),
        },
      );
      await clearApplicantProfileCache(result?.user_id);
      setRejectId(null);
      setReason('');
      await refreshRelated();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setActionLoading(false);
    }
  }

  const displayError =
    actionError ||
    error ||
    (degraded ? 'No se pudieron cargar las solicitudes. Intenta de nuevo.' : '');

  return (
    <div className="space-y-6">
      <ActionOverlay show={actionLoading} message="Procesando solicitud..." />
      <h2 className="text-2xl font-semibold">Solicitudes pendientes</h2>
      {displayError && <p className="text-sm text-red-400">{displayError}</p>}
      {isLoading ? (
        <Card><p className="text-zinc-500">Cargando solicitudes...</p></Card>
      ) : degraded ? (
        <Card>
          <p className="text-zinc-500">Servicio temporalmente limitado.</p>
          <Button className="mt-3" size="sm" onClick={() => mutate()}>Reintentar</Button>
        </Card>
      ) : requests.length === 0 ? (
        <Card><p className="text-zinc-500">No hay solicitudes pendientes.</p></Card>
      ) : (
        requests.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-semibold">{r.users?.full_name}</p>
                <p className="text-sm text-zinc-500">{r.users?.email}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="amber">{ROLE_LABELS[r.requested_role]}</Badge>
                  {r.institutions?.name && <Badge>{r.institutions.name}</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(r.id)} disabled={actionLoading}>
                  <Check className="mr-1 h-4 w-4" />Aprobar
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRejectId(r.id)} disabled={actionLoading}>
                  <X className="mr-1 h-4 w-4" />Denegar
                </Button>
              </div>
            </div>
            {rejectId === r.id && (
              <div className="mt-4 flex gap-2">
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo del rechazo..."
                  className="flex-1"
                />
                <Button variant="danger" size="sm" onClick={() => reject(r.id)}>Confirmar</Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
