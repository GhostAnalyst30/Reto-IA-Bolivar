'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Label, Select, LoadingState } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

interface Outcome {
  id: string;
  user_id: string;
  enrollment_status: string;
  withdrawal_reason?: string;
  effective_date?: string;
  notes?: string;
  users?: { full_name: string; email: string };
}

interface StudentOption {
  user_id: string;
  full_name: string;
  email: string;
}

const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo',
  aplazado: 'Aplazado',
  retirado: 'Retirado',
  graduado: 'Graduado',
};

export default function AcademicOutcomesPage() {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('activo');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    const params = filter ? `?status=${filter}` : '';
    const [outData, usersData] = await Promise.all([
      proxyJson<Outcome[]>(`/institutional/academic-outcomes${params}`),
      proxyJson<{ users: StudentOption[] }>('/institutional/users?role=student'),
    ]);
    setOutcomes(Array.isArray(outData) ? outData : []);
    setStudents(usersData?.users || []);
  }, [filter]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    await proxyJson('/institutional/academic-outcomes', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        enrollment_status: status,
        withdrawal_reason: reason || null,
        notes: notes || null,
      }),
    });
    setUserId('');
    setReason('');
    setNotes('');
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Estados académicos</h1>
        <p className="text-muted">Registro manual de retiro, aplazamiento o graduación (calibración de deserción)</p>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Registrar estado</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Estudiante</Label>
            <Select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {students.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.full_name} ({s.email})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="activo">Activo</option>
              <option value="aplazado">Aplazado</option>
              <option value="retirado">Retirado</option>
              <option value="graduado">Graduado</option>
            </Select>
          </div>
          <div>
            <Label>Motivo de retiro (opcional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Económico, académico..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </form>
      </Card>

      <div>
        <Label>Filtrar por estado</Label>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs mt-1">
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="aplazado">Aplazado</option>
          <option value="retirado">Retirado</option>
          <option value="graduado">Graduado</option>
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-2">
          {outcomes.map((o) => (
            <Card key={o.id} className="p-3 flex flex-wrap justify-between gap-2">
              <div>
                <Link href={`/institutional/students/${o.user_id}`} className="font-medium text-brand-amber hover:underline">
                  {o.users?.full_name || o.user_id}
                </Link>
                <p className="text-sm text-muted">{o.users?.email}</p>
                {o.withdrawal_reason && <p className="text-xs mt-1">Motivo: {o.withdrawal_reason}</p>}
              </div>
              <span className="text-sm capitalize font-medium">{STATUS_LABELS[o.enrollment_status] || o.enrollment_status}</span>
            </Card>
          ))}
          {outcomes.length === 0 && <p className="text-muted text-sm">Sin registros.</p>}
        </div>
      )}
    </div>
  );
}
