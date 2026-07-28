'use client';

import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';
import { CalendarClock } from 'lucide-react';

interface AppointmentModalProps {
  open: boolean;
  chatId?: string | null;
  onClose: () => void;
  onCreated?: () => void;
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentModal({ open, chatId, onClose, onCreated }: AppointmentModalProps) {
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(10, 0, 0, 0);

  const [proposedAt, setProposedAt] = useState(toLocalInputValue(defaultDate));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      const iso = new Date(proposedAt).toISOString();
      await proxyJson('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          proposed_at: iso,
          reason: reason.trim() || undefined,
          chat_id: chatId || undefined,
        }),
      });
      setDone(true);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agendar la cita');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">Agendar cita con psicología</h3>
        </div>

        {done ? (
          <>
            <p className="text-sm text-on-surface">
              Tu solicitud quedó <strong>pendiente</strong>. El psicólogo confirmará la disponibilidad
              y ambos recibirán un correo.
            </p>
            <Button onClick={onClose}>Cerrar</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant">
              Propón una fecha y hora. El correo <strong>psicologo@utb.edu.co</strong> recibirá la
              solicitud para confirmar disponibilidad.
            </p>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-on-surface">Fecha y hora</span>
              <Input
                type="datetime-local"
                value={proposedAt}
                onChange={(e) => setProposedAt(e.target.value)}
                min={toLocalInputValue(new Date())}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-on-surface">Motivo (opcional)</span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Breve descripción de lo que necesitas"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={submit} disabled={submitting || !proposedAt}>
                {submitting ? 'Enviando…' : 'Solicitar cita'}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
