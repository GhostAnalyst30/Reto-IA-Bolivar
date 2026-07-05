'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { PrivacyBanner } from '@/components/ui/PrivacyBanner';
import { proxyJson } from '@/lib/proxy';

interface RiskStudent {
  user_id: string;
  full_name: string;
  program?: string;
  semester?: number;
  risk_level: string;
  risk_score: number;
  factors?: { key: string; label: string; weight: number }[];
}

const LEVEL_STYLES: Record<string, string> = {
  bajo: 'bg-green-500/20 text-green-400',
  moderado: 'bg-amber-500/20 text-amber-400',
  alto: 'bg-red-500/20 text-red-400',
};

export default function RiskReportPage() {
  const [students, setStudents] = useState<RiskStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await proxyJson<RiskStudent[]>('/institutional/risk/students');
    setStudents(Array.isArray(data) ? data : []);
  }

  async function recompute() {
    setLoading(true);
    await proxyJson('/institutional/risk/compute', { method: 'POST', body: '{}' });
    await load();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Reporte de riesgo de deserción</h1>
          <p className="text-zinc-500">Estudiantes priorizados por nivel de riesgo</p>
        </div>
        <Button onClick={recompute} disabled={loading}>
          {loading ? 'Calculando...' : 'Recalcular riesgo'}
        </Button>
      </div>

      <PrivacyBanner message="Los datos del Digital Twin confidencial solo son visibles si el estudiante otorgó consentimiento." />

      <div className="overflow-x-auto rounded-lg border border-brand-border">
        <table className="w-full text-sm">
          <thead className="border-b border-brand-border bg-brand-surface">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Estudiante</th>
              <th className="px-4 py-3 text-left font-medium">Programa</th>
              <th className="px-4 py-3 text-left font-medium">Riesgo</th>
              <th className="px-4 py-3 text-left font-medium">Score</th>
              <th className="px-4 py-3 text-left font-medium">Factores</th>
              <th className="px-4 py-3 text-left font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.user_id} className="border-b border-brand-border/50 hover:bg-brand-bg/50">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-zinc-500">{s.program || '—'} {s.semester ? `(S${s.semester})` : ''}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs capitalize ${LEVEL_STYLES[s.risk_level] || ''}`}>
                    {s.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3">{s.risk_score}</td>
                <td className="px-4 py-3 text-zinc-500 max-w-xs">
                  {(s.factors || []).map((f) => f.label).join('; ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/institutional/students/${s.user_id}`} className="text-brand-amber hover:underline">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <p className="p-8 text-center text-zinc-500">No hay estudiantes registrados o ejecuta recalcular riesgo.</p>
        )}
      </div>
    </div>
  );
}
