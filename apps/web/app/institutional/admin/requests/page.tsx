'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Badge, Input } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface Request {
  id: string;
  requested_role: string;
  created_at: string;
  users: { full_name: string; email: string };
  institutions: { name: string };
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch('/api/proxy?path=/admin/requests');
    setRequests(await res.json());
  }

  async function approve(id: string) {
    await fetch(`/api/proxy?path=/admin/requests/${id}/approve`, { method: 'POST', body: '{}' });
    load();
  }

  async function reject(id: string) {
    await fetch(`/api/proxy?path=/admin/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Solicitud no aprobada' }),
    });
    setRejectId(null);
    setReason('');
    load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Solicitudes pendientes</h2>
      {requests.length === 0 ? (
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
                  <Badge>{r.institutions?.name}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(r.id)}><Check className="mr-1 h-4 w-4" />Aprobar</Button>
                <Button size="sm" variant="danger" onClick={() => setRejectId(r.id)}><X className="mr-1 h-4 w-4" />Denegar</Button>
              </div>
            </div>
            {rejectId === r.id && (
              <div className="mt-4 flex gap-2">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo del rechazo..." className="flex-1" />
                <Button variant="danger" size="sm" onClick={() => reject(r.id)}>Confirmar</Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
