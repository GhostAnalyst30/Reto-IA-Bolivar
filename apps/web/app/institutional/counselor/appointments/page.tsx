'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Input, LoadingState, EmptyState } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { CalendarClock, CheckCircle, XCircle } from 'lucide-react';

interface AppointmentRow {
  id: string;
  proposed_at: string;
  duration_minutes?: number;
  reason?: string;
  status: string;
  counselor_note?: string;
  student_name?: string;
  student_email?: string;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

export default function CounselorAppointmentsPage() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    const data = await proxyJson<AppointmentRow[]>('/appointments/inbox');
    setRows(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function decide(id: string, action: 'confirm' | 'reject') {
    setBusyId(id);
    try {
      await proxyJson(`/appointments/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ counselor_note: noteById[id]?.trim() || undefined }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const visible = filter === 'pending' ? rows.filter((r) => r.status === 'pending') : rows;

  if (loading) return <LoadingState message="Cargando citas…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-primary">
            <CalendarClock className="h-6 w-6" />
            Citas de psicología
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Confirma o rechaza disponibilidad. Ambos recibirán correo al decidir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'primary' : 'secondary'}
            onClick={() => setFilter('pending')}
          >
            Pendientes
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Sin citas" description="No hay solicitudes en este filtro." />
      ) : (
        <div className="space-y-4">
          {visible.map((row) => (
            <PortalCard key={row.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-on-surface">
                    {row.student_name || 'Estudiante'} · {row.student_email}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {formatWhen(row.proposed_at)} · {row.duration_minutes || 45} min
                  </p>
                  {row.reason && (
                    <p className="mt-2 text-sm text-on-surface">Motivo: {row.reason}</p>
                  )}
                </div>
                <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold">
                  {STATUS_LABEL[row.status] || row.status}
                </span>
              </div>

              {row.status === 'pending' && (
                <>
                  <Input
                    value={noteById[row.id] || ''}
                    onChange={(e) =>
                      setNoteById((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    placeholder="Nota opcional (reagendar, sala, etc.)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => decide(row.id, 'confirm')}
                      disabled={busyId === row.id}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Confirmar disponibilidad
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => decide(row.id, 'reject')}
                      disabled={busyId === row.id}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      No disponible
                    </Button>
                  </div>
                </>
              )}

              {row.counselor_note && row.status !== 'pending' && (
                <p className="text-xs text-on-surface-variant">Nota: {row.counselor_note}</p>
              )}
            </PortalCard>
          ))}
        </div>
      )}
    </div>
  );
}
