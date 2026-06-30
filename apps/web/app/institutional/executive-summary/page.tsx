'use client';

import { useEffect, useState } from 'react';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { proxyJson } from '@/lib/proxy';
import { Button } from '@/components/ui';

export default function ExecutiveSummaryPage() {
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await proxyJson<{ insights: string }>('/institutional/director/chat', { method: 'POST' });
      setInsights(data.insights || '');
    } catch {
      setInsights('Lo siento, el servidor no funciona');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Resumen ejecutivo</h1>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? 'Generando…' : 'Actualizar'}</Button>
      </div>
      <BentoGrid cols={1}>
        <BentoCell colSpan={3}>
          <p className="text-sm text-zinc-500 mb-4">Generado desde KPIs en tiempo real — UTB</p>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-zinc-400 leading-relaxed">
            {insights || 'Cargando resumen…'}
          </div>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
