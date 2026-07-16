'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, LoadingState, EmptyState, Input, Label, Select } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { ShieldCheck } from 'lucide-react';

interface RiskStudent {
  user_id: string;
  full_name: string;
  program?: string;
  semester?: number;
  risk_level: string;
  risk_score: number;
  dominant_cause?: string;
  factors?: { key: string; label: string; weight: number }[];
}

const LEVEL_STYLES: Record<string, string> = {
  bajo: 'bg-green-500/20 text-green-400',
  moderado: 'bg-amber-500/20 text-amber-400',
  alto: 'bg-red-500/20 text-red-400',
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

export default function RiskReportPage() {
  const [students, setStudents] = useState<RiskStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [minScore, setMinScore] = useState('');
  const [dominantCause, setDominantCause] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (program) params.set('program', program);
    if (riskLevel) params.set('risk_level', riskLevel);
    if (minScore) params.set('min_score', minScore);
    if (dominantCause) params.set('dominant_cause', dominantCause);
    const qs = params.toString();
    const data = await proxyJson<RiskStudent[]>(`/institutional/risk/students${qs ? `?${qs}` : ''}`);
    setStudents(Array.isArray(data) ? data : []);
  }, [search, program, riskLevel, minScore, dominantCause]);

  const skipDebounce = useRef(true);

  useEffect(() => {
    if (skipDebounce.current) {
      skipDebounce.current = false;
      load().finally(() => setInitialLoading(false));
      return;
    }
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, program, riskLevel, minScore, dominantCause, load]);

  async function recompute() {
    setLoading(true);
    await proxyJson('/institutional/risk/compute', { method: 'POST', body: '{}' });
    await load();
    setLoading(false);
  }

  const programs = [...new Set(students.map((s) => s.program).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Reporte de riesgo de deserción</h1>
          <p className="text-muted">Estudiantes priorizados por nivel de riesgo — UTB</p>
        </div>
        <Button onClick={recompute} disabled={loading}>
          {loading ? 'Calculando...' : 'Recalcular riesgo'}
        </Button>
      </div>

      <PortalCard className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Label>Buscar estudiante</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre..." />
        </div>
        <div>
          <Label>Programa</Label>
          <Select value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">Todos</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <Label>Nivel de riesgo</Label>
          <Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
            <option value="">Todos</option>
            <option value="bajo">Bajo</option>
            <option value="moderado">Moderado</option>
            <option value="alto">Alto</option>
          </Select>
        </div>
        <div>
          <Label>Causa dominante</Label>
          <Select value={dominantCause} onChange={(e) => setDominantCause(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(CAUSE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Score mínimo</Label>
          <Input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" />
        </div>
      </PortalCard>

      <PrivacyBanner message="Los datos del Digital Twin confidencial solo son visibles si el estudiante otorgó consentimiento." />

      {initialLoading ? (
        <LoadingState rows={3} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8" />}
          title="Sin estudiantes para evaluar"
          description="No hay estudiantes que coincidan con los filtros, o aún no se ha calculado el riesgo."
        />
      ) : (
        <PortalCard className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-border bg-brand-surface">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Estudiante</th>
                <th className="px-4 py-3 text-left font-medium">Programa</th>
                <th className="px-4 py-3 text-left font-medium">Riesgo</th>
                <th className="px-4 py-3 text-left font-medium">Causa</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Factores</th>
                <th className="px-4 py-3 text-left font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.user_id} className="border-b border-brand-border/50 hover:bg-brand-bg/50">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-muted">{s.program || '—'} {s.semester ? `(S${s.semester})` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs capitalize ${LEVEL_STYLES[s.risk_level] || ''}`}>
                      {s.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {s.dominant_cause ? (CAUSE_LABELS[s.dominant_cause] || s.dominant_cause) : '—'}
                  </td>
                  <td className="px-4 py-3">{s.risk_score}</td>
                  <td className="px-4 py-3 text-muted max-w-xs">
                    {(s.factors || []).map((f) => f.label).join('; ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/institutional/students/${s.user_id}`} className="text-[var(--portal-accent)] hover:underline">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PortalCard>
      )}
    </div>
  );
}
