'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Badge, Input } from '@/components/ui';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { ROLE_LABELS } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface Request {
  id: string;
  requested_role: string;
  created_at: string;
  users: { full_name: string; email: string };
  institutions: { name: string } | null;
}

export function RequestsPanel() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await proxyJson<Request[]>('/admin/requests');
      setRequests(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('institution-context-changed', onChange);
    return () => window.removeEventListener('institution-context-changed', onChange);
  }, []);

  async function approve(id: string) {
    setActionLoading(true);
    setError('');
    try {
      await proxyJson(`/admin/requests/${id}/approve`, { method: 'POST', body: '{}' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  }

  async function reject(id: string) {
    setActionLoading(true);
    try {
      await proxyJson(`/admin/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Solicitud no aprobada' }),
      });
      setRejectId(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ActionOverlay show={actionLoading} message="Procesando solicitud..." />
      <h2 className="text-2xl font-semibold">Solicitudes pendientes</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <Card><p className="text-zinc-500">Cargando solicitudes...</p></Card>
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
