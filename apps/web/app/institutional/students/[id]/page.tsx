'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { proxyJson } from '@/lib/proxy';

interface StudentDetail {
  student: { id: string; full_name: string; email: string; created_at: string };
  profile: Record<string, unknown>;
  risk: { risk_level: string; risk_score: number; factors?: { label: string }[] };
  interventions: { id: string; type: string; notes: string; status: string; created_at: string }[];
  activity: { id: string; title: string; updated_at: string }[];
  digital_twin: { summary_text?: string; interests?: string[]; learning_style?: string } | null;
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('academica');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) proxyJson<StudentDetail>(`/institutional/students/${id}`).then(setData).catch(() => setData(null));
  }, [id]);

  async function registerIntervention(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await proxyJson('/institutional/interventions', {
      method: 'POST',
      body: JSON.stringify({ student_id: id, type, notes }),
    });
    const refreshed = await proxyJson<StudentDetail>(`/institutional/students/${id}`);
    setData(refreshed);
    setNotes('');
    setSaving(false);
  }

  if (!data) return <p className="text-zinc-500">Cargando estudiante...</p>;

  return (
    <div className="space-y-6">
      <Link href="/institutional/risk" className="text-sm text-brand-amber hover:underline">← Volver al reporte</Link>
      <div>
        <h1 className="font-display text-2xl font-bold">{data.student.full_name}</h1>
        <p className="text-zinc-500">{data.student.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Nivel de riesgo</p>
          <p className="text-2xl font-bold capitalize text-brand-amber">{data.risk.risk_level}</p>
          <p className="text-sm">Score: {data.risk.risk_score}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Programa</p>
          <p className="font-medium">{(data.profile.program as string) || 'No registrado'}</p>
          <p className="text-sm text-zinc-500">Semestre {(data.profile.semester as number) || '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Factores de riesgo</p>
          <ul className="mt-2 text-sm text-zinc-400 space-y-1">
            {(data.risk.factors || []).map((f) => <li key={f.label}>• {f.label}</li>)}
          </ul>
        </Card>
      </div>

      {data.digital_twin ? (
        <Card>
          <h2 className="font-semibold mb-2">Digital Twin (consentimiento otorgado)</h2>
          <PrivacyBanner message="Información compartida voluntariamente por el estudiante." />
          <p className="mt-3 text-sm">{data.digital_twin.summary_text}</p>
          <p className="mt-2 text-xs text-zinc-500">Estilo: {data.digital_twin.learning_style}</p>
        </Card>
      ) : (
        <Card className="opacity-70">
          <p className="text-sm text-zinc-500">Digital Twin no disponible — el estudiante no ha compartido su perfil confidencial.</p>
        </Card>
      )}

      <section>
        <h2 className="font-semibold mb-3">Historial de actividad</h2>
        <ul className="space-y-2 text-sm">
          {data.activity.map((a) => (
            <li key={a.id} className="rounded border border-brand-border px-3 py-2">
              {a.title} — {new Date(a.updated_at).toLocaleDateString('es-CO')}
            </li>
          ))}
          {data.activity.length === 0 && <p className="text-zinc-500">Sin actividad reciente</p>}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Intervenciones</h2>
        {data.interventions.map((i) => (
          <Card key={i.id} className="mb-2">
            <p className="text-sm capitalize text-brand-amber">{i.type}</p>
            <p className="text-sm">{i.notes}</p>
            <p className="text-xs text-zinc-500 mt-1">{new Date(i.created_at).toLocaleDateString('es-CO')} — {i.status}</p>
          </Card>
        ))}
        <Card className="mt-4">
          <h3 className="font-medium mb-3">Registrar intervención</h3>
          <form onSubmit={registerIntervention} className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="academica">Académica</option>
                <option value="psicologia">Psicología</option>
                <option value="tutoria">Tutoría</option>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} required />
            </div>
            <Button type="submit" disabled={saving}>Registrar</Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
