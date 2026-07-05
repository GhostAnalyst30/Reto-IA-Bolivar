'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { OpportunityGraph } from '@/components/opportunities/OpportunityGraph';
import { proxyJson } from '@/lib/proxy';

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description?: string;
  requirements?: string[];
  area?: string;
  deadline?: string;
  external_url?: string;
  saved_status?: string | null;
}

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) proxyJson<Opportunity>(`/opportunities/${id}`).then(setOpp).catch(() => setOpp(null));
  }, [id]);

  async function save() {
    setLoading(true);
    await proxyJson(`/opportunities/${id}/save`, { method: 'POST', body: '{}' });
    setOpp((o) => o ? { ...o, saved_status: 'saved' } : o);
    setLoading(false);
  }

  async function apply() {
    setLoading(true);
    await proxyJson(`/opportunities/${id}/apply`, { method: 'POST', body: '{}' });
    setOpp((o) => o ? { ...o, saved_status: 'applied' } : o);
    setLoading(false);
  }

  if (!opp) return <p className="text-zinc-500">Cargando...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>← Volver</Button>
      <div>
        <span className="text-sm uppercase text-brand-amber">{opp.type}</span>
        <h1 className="font-display text-2xl font-bold mt-1">{opp.title}</h1>
        {opp.area && <p className="text-sm text-zinc-500">Área: {opp.area}</p>}
      </div>

      <Card>
        <p className="leading-relaxed">{opp.description}</p>
        {opp.deadline && <p className="mt-4 text-sm"><strong>Fecha límite:</strong> {opp.deadline}</p>}
        {opp.requirements && opp.requirements.length > 0 && (
          <div className="mt-4">
            <p className="font-medium mb-2">Requisitos</p>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1">
              {opp.requirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
      </Card>

      <OpportunityGraph opportunityTitle={opp.title} area={opp.area} />

      <div className="flex flex-wrap gap-3">
        {opp.saved_status !== 'applied' && (
          <>
            <Button onClick={save} disabled={loading || opp.saved_status === 'saved'}>
              {opp.saved_status === 'saved' ? 'Guardada' : 'Guardar'}
            </Button>
            <Button variant="secondary" onClick={apply} disabled={loading}>
              Aplicar (simulado)
            </Button>
          </>
        )}
        {opp.saved_status === 'applied' && (
          <p className="text-green-400 text-sm">✓ Solicitud registrada</p>
        )}
        {opp.external_url && (
          <a href={opp.external_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost">Más información</Button>
          </a>
        )}
      </div>
    </div>
  );
}
