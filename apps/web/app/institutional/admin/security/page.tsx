'use client';

import { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { Shield, AlertTriangle } from 'lucide-react';

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

  useEffect(() => { load(); }, []);

  async function load() {
    const [ev, sess] = await Promise.all([
      fetch('/api/proxy?path=/admin/security-events').then((r) => r.json()),
      fetch('/api/proxy?path=/admin/sessions').then((r) => r.json()),
    ]);
    setEvents(ev || []);
    setSessions(sess || []);
  }

  async function revokeSession(id: string) {
    await fetch(`/api/proxy?path=/admin/sessions/${id}/revoke`, { method: 'POST', body: '{}' });
    load();
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
      </section>
    </div>
  );
}
