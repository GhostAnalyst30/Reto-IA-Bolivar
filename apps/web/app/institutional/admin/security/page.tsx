'use client';

import { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { Shield, AlertTriangle } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  ip_address?: string;
  created_at: string;
  details?: Record<string, unknown>;
}

interface Session {
  id: string;
  portal: string;
  role: string;
  last_activity_at: string;
  users?: { full_name: string; email: string };
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [ev, sess] = await Promise.all([
        proxyJson<SecurityEvent[]>('/admin/security-events'),
        proxyJson<Session[]>('/admin/sessions'),
      ]);
      setEvents(Array.isArray(ev) ? ev : []);
      setSessions(Array.isArray(sess) ? sess : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar panel de seguridad');
    }
  }

  async function revokeSession(id: string) {
    try {
      await proxyJson(`/admin/sessions/${id}/revoke`, { method: 'POST', body: '{}' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al revocar sesión');
    }
  }

  const critical = events.filter((e) => e.severity === 'high' || e.severity === 'critical');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-brand-amber" />
        <h2 className="text-2xl font-semibold">Panel de seguridad</h2>
        {critical.length > 0 && (
          <Badge variant="red">{critical.length} alertas activas</Badge>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" /> Eventos recientes
        </h3>
        <div className="space-y-2">
          {events.length === 0 ? (
            <Card><p className="text-zinc-500">Sin eventos registrados.</p></Card>
          ) : events.slice(0, 20).map((e) => (
            <Card key={e.id} className="flex justify-between py-3">
              <div>
                <p className="font-medium text-sm">{e.event_type}</p>
                <p className="text-xs text-zinc-500">{new Date(e.created_at).toLocaleString('es')}</p>
              </div>
              <Badge variant={e.severity === 'high' || e.severity === 'critical' ? 'red' : 'default'}>{e.severity}</Badge>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-4">Sesiones activas</h3>
        {sessions.length === 0 ? (
          <Card><p className="text-zinc-500">No hay sesiones registradas en el sistema.</p></Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="flex justify-between items-center py-3">
                <div>
                  <p className="font-medium text-sm">{s.users?.full_name || s.users?.email}</p>
                  <p className="text-xs text-zinc-500">{s.portal} · {s.role}</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => revokeSession(s.id)}>Revocar</Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
