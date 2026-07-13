'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { proxyJson } from '@/lib/proxy';

const FACTOR_ACTIONS: Record<string, { action: string; type: string }> = {
  inactivity: { action: 'Contacto proactivo / recordatorio Digital Twin', type: 'tutoria' },
  survey: { action: 'Recordatorio encuesta psicométrica de onboarding', type: 'academica' },
  progress: { action: 'Revisar ruta de aprendizaje y tutoría', type: 'academica' },
  mood: { action: 'Derivación a bienestar / psicología', type: 'psicologia' },
  estres_alto: { action: 'Recursos de manejo de estrés', type: 'psicologia' },
  motivacion_baja: { action: 'Conversación de re-motivación vocacional', type: 'tutoria' },
  apoyo_social_bajo: { action: 'Vincular a grupos de apoyo / mentoría', type: 'psicologia' },
  situacion_economica: { action: 'Orientar a becas y apoyo económico', type: 'academica' },
  solicitud_apoyo_activa: { action: 'Atender solicitud de apoyo humano pendiente', type: 'psicologia' },
};

const CAUSE_LABELS: Record<string, string> = {
  desengagement: 'Desengagement',
  onboarding: 'Onboarding',
  academico: 'Académico',
  emocional: 'Emocional',
  economico: 'Económico',
  motivacional: 'Motivacional',
  social: 'Social',
};

const DOMINANT_TYPE: Record<string, string> = {
  desengagement: 'tutoria',
  onboarding: 'academica',
  academico: 'academica',
  emocional: 'psicologia',
  economico: 'academica',
  motivacional: 'tutoria',
  social: 'psicologia',
};

interface StudentDetail {
  student: { id: string; full_name: string; email: string; created_at: string };
  profile: Record<string, unknown>;
  risk: {
    risk_level: string;
    risk_score: number;
    dominant_cause?: string;
    factors?: { key: string; label: string; weight: number }[];
  };
  risk_history?: { risk_score: number; risk_level: string; computed_at: string }[];
  interventions: { id: string; type: string; notes: string; status: string; created_at: string }[];
  support_requests?: { id: string; reason: string; status: string; created_at: string }[];
  activity: { id: string; title: string; updated_at: string }[];
  digital_twin: { summary_text?: string; interests?: string[]; learning_style?: string } | null;
  recommended_opportunities?: { id: string; title: string; type: string; match_score: number; match_reasons?: string[] }[];
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('academica');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    proxyJson<StudentDetail>(`/institutional/students/${id}`).then((d) => {
      setData(d);
      if (d?.risk?.dominant_cause && DOMINANT_TYPE[d.risk.dominant_cause]) {
        setType(DOMINANT_TYPE[d.risk.dominant_cause]);
      }
    }).catch(() => setData(null));
  }, [id]);

  async function refresh() {
    if (!id) return;
    const refreshed = await proxyJson<StudentDetail>(`/institutional/students/${id}`);
    setData(refreshed);
  }

  async function registerIntervention(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await proxyJson('/institutional/interventions', {
      method: 'POST',
      body: JSON.stringify({ student_id: id, type, notes }),
    });
    await refresh();
    setNotes('');
    setSaving(false);
  }

  async function closeIntervention(interventionId: string) {
    await proxyJson(`/institutional/interventions/${interventionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    });
    await refresh();
  }

  if (!data) return <p className="text-zinc-500">Cargando estudiante...</p>;

  const history = data.risk_history || [];
  const trend =
    history.length >= 2
      ? history[0].risk_score - history[1].risk_score
      : null;

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
          {trend !== null && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-muted'}`}>
              {trend > 0 ? `↑ +${trend.toFixed(1)}` : trend < 0 ? `↓ ${trend.toFixed(1)}` : 'Sin cambio'} vs reporte anterior
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Programa</p>
          <p className="font-medium">{(data.profile.program as string) || 'No registrado'}</p>
          <p className="text-sm text-zinc-500">Semestre {(data.profile.semester as number) || '—'}</p>
          {data.risk.dominant_cause && (
            <p className="text-xs mt-2 text-brand-amber">
              Causa dominante: {CAUSE_LABELS[data.risk.dominant_cause] || data.risk.dominant_cause}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Factores de riesgo</p>
          <ul className="mt-2 text-sm text-zinc-400 space-y-1">
            {(data.risk.factors || []).map((f) => <li key={f.label}>• {f.label}</li>)}
          </ul>
        </Card>
      </div>

      {(data.risk.factors || []).length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Acciones sugeridas por factor</h2>
          <ul className="space-y-2 text-sm">
            {(data.risk.factors || []).map((f) => {
              const suggestion = FACTOR_ACTIONS[f.key];
              return (
                <li key={f.key} className="flex flex-wrap justify-between gap-2 border-b border-brand-border/50 pb-2">
                  <span className="text-muted">{f.label}</span>
                  <span>{suggestion?.action || 'Monitorear'}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {(data.recommended_opportunities || []).length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Becas y oportunidades recomendadas</h2>
          <ul className="space-y-2 text-sm">
            {data.recommended_opportunities!.map((o) => (
              <li key={o.id} className="rounded border border-brand-border px-3 py-2">
                <span className="font-medium">{o.title}</span>
                <span className="text-xs text-muted ml-2 capitalize">({o.type})</span>
                {(o.match_reasons || []).length > 0 && (
                  <p className="text-xs text-muted mt-1">{o.match_reasons!.join(' · ')}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(data.support_requests || []).length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Solicitudes de apoyo</h2>
          <ul className="space-y-2 text-sm">
            {data.support_requests!.map((s) => (
              <li key={s.id} className="rounded border border-brand-border px-3 py-2">
                <p>{s.reason}</p>
                <p className="text-xs text-muted">{s.status} — {new Date(s.created_at).toLocaleDateString('es-CO')}</p>
              </li>
            ))}
          </ul>
          <Link href="/institutional/admin/support-requests" className="text-xs text-brand-amber hover:underline mt-2 inline-block">
            Gestionar bandeja de apoyo →
          </Link>
        </Card>
      )}

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

      {history.length > 1 && (
        <section>
          <h2 className="font-semibold mb-3">Tendencia de riesgo</h2>
          <div className="flex gap-1 items-end h-16">
            {[...history].reverse().map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-brand-amber/60 rounded-t min-w-[8px]"
                style={{ height: `${Math.max(8, h.risk_score)}%` }}
                title={`${h.risk_score} — ${new Date(h.computed_at).toLocaleDateString('es-CO')}`}
              />
            ))}
          </div>
        </section>
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
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-sm capitalize text-brand-amber">{i.type}</p>
              {i.status === 'open' && (
                <Button size="sm" variant="secondary" onClick={() => closeIntervention(i.id)}>
                  Cerrar
                </Button>
              )}
            </div>
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
