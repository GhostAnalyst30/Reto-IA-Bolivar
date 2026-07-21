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
    // Best-effort
  }
}

export function RequestsPanel() {
  const { data, error, isLoading, mutate } = useProxyJson<Request[] | { degraded?: boolean }>('/admin/requests');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const degraded = Boolean(data && !Array.isArray(data) && (data as { degraded?: boolean }).degraded);
  const requests = Array.isArray(data) ? data : [];

  useEffect(() => {
    const onChange = () => mutate();
    window.addEventListener('institution-context-changed', onChange);
    return () => window.removeEventListener('institution-context-changed', onChange);
  }, [mutate]);

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(requests.map((r) => r.id));
      return new Set([...prev].filter((id) => ids.has(id)));
    });
  }, [requests]);

  async function refreshRelated() {
    await mutate();
    await Promise.all([
      globalMutate('/platform/dashboard'),
      globalMutate('/admin/requests'),
    ]);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === requests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(requests.map((r) => r.id)));
    }
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await mutate(
        (current) => (Array.isArray(current) ? current.filter((r) => r.id !== id) : current),
        { revalidate: true },
      );
      await refreshRelated();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  }

  async function approveBatch(allPending: boolean) {
    setActionLoading(true);
    setActionError('');
    const ids = allPending ? undefined : [...selected];
    if (!allPending && (!ids || ids.length === 0)) {
      setActionError('Selecciona al menos una solicitud');
      setActionLoading(false);
      return;
    }
    try {
      const result = await proxyJson<{
        approved: { user_id?: string; request_id?: string }[];
        failed: { id: string; detail: string }[];
        count: number;
      }>('/admin/requests/approve-batch', {
        method: 'POST',
        body: JSON.stringify(allPending ? { all_pending: true } : { ids }),
      });
      const approvedIds = new Set((result.approved || []).map((a) => a.request_id).filter(Boolean));
      for (const a of result.approved || []) {
        await clearApplicantProfileCache(a.user_id);
      }
      await mutate(
        (current) =>
          Array.isArray(current)
            ? current.filter((r) => !approvedIds.has(r.id) && !(ids || []).includes(r.id) && !(allPending && (result.count || 0) > 0))
            : current,
        { revalidate: true },
      );
      if (allPending) {
        await mutate([], { revalidate: true });
      } else if (ids) {
        const idSet = new Set(ids);
        await mutate(
          (current) => (Array.isArray(current) ? current.filter((r) => !idSet.has(r.id)) : current),
          { revalidate: true },
        );
      }
      setSelected(new Set());
      await refreshRelated();
      if (result.failed?.length) {
        setActionError(`${result.count} vinculadas; ${result.failed.length} con error`);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error al vincular en lote');
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
      await mutate(
        (current) => (Array.isArray(current) ? current.filter((r) => r.id !== id) : current),
        { revalidate: true },
      );
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Solicitudes pendientes</h2>
        {requests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={toggleAll} disabled={actionLoading}>
              {selected.size === requests.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Button>
            <Button
              size="sm"
              onClick={() => approveBatch(false)}
              disabled={actionLoading || selected.size === 0}
            >
              <Check className="mr-1 h-4 w-4" />
              Vincular seleccionados ({selected.size})
            </Button>
            <Button size="sm" onClick={() => approveBatch(true)} disabled={actionLoading}>
              <Check className="mr-1 h-4 w-4" />
              Vincular a todos
            </Button>
          </div>
        )}
      </div>
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
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--portal-accent,#F28C28)]"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  aria-label={`Seleccionar ${r.users?.full_name}`}
                />
                <div>
                  <p className="font-semibold">{r.users?.full_name}</p>
                  <p className="text-sm text-zinc-500">{r.users?.email}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="amber">{ROLE_LABELS[r.requested_role] || r.requested_role}</Badge>
                    {r.institutions?.name && <Badge>{r.institutions.name}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(r.id)} disabled={actionLoading}>
                  <Check className="mr-1 h-4 w-4" />Vincular
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
