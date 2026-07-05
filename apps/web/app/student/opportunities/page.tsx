'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Select } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description?: string;
  area?: string;
  deadline?: string;
  match_score?: number;
  match_reasons?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  beca: 'Beca',
  convocatoria: 'Convocatoria',
  evento: 'Evento',
};

export default function OpportunitiesPage() {
  const [all, setAll] = useState<Opportunity[]>([]);
  const [recommended, setRecommended] = useState<Opportunity[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [typeFilter, areaFilter]);

  function load() {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (areaFilter) params.set('area', areaFilter);
    const qs = params.toString() ? `?${params}` : '';
    Promise.all([
      proxyJson<Opportunity[]>(`/opportunities${qs}`),
      proxyJson<Opportunity[]>('/opportunities/recommended'),
    ])
      .then(([allData, recData]) => {
        setAll(allData);
        setRecommended(recData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Oportunidades UTB</h1>
        <p className="text-zinc-500">Becas, convocatorias y eventos personalizados para ti</p>
      </div>

      {recommended.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-brand-amber">Recomendaciones para ti</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((o) => (
              <OppCard key={o.id} opp={o} highlight />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="beca">Becas</option>
          <option value="convocatoria">Convocatorias</option>
          <option value="evento">Eventos</option>
        </Select>
        <Select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="">Todas las áreas</option>
          <option value="ingenieria">Ingeniería</option>
          <option value="bienestar">Bienestar</option>
          <option value="general">General</option>
          <option value="tecnologia">Tecnología</option>
        </Select>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {all.map((o) => (
          <OppCard key={o.id} opp={o} />
        ))}
      </div>
      {all.length === 0 && !error && (
        <p className="text-zinc-500">No hay oportunidades disponibles. Contacta a bienestar UTB.</p>
      )}
    </div>
  );
}

function OppCard({ opp, highlight }: { opp: Opportunity; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-brand-amber/40' : ''}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs uppercase text-brand-amber">{TYPE_LABELS[opp.type] || opp.type}</span>
        {opp.match_score != null && opp.match_score > 0 && (
          <span className="rounded bg-brand-amber/20 px-2 py-0.5 text-xs text-brand-amber">{opp.match_score}% match</span>
        )}
      </div>
      <h3 className="mt-2 font-semibold">{opp.title}</h3>
      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{opp.description}</p>
      {opp.deadline && <p className="mt-2 text-xs text-zinc-400">Límite: {opp.deadline}</p>}
      {opp.match_reasons && opp.match_reasons.length > 0 && (
        <ul className="mt-2 text-xs text-zinc-500">
          {opp.match_reasons.map((r) => <li key={r}>• {r}</li>)}
        </ul>
      )}
      <Link href={`/student/opportunities/${opp.id}`} className="mt-4 inline-block">
        <Button size="sm" variant="secondary">Ver detalle</Button>
      </Link>
    </Card>
  );
}
