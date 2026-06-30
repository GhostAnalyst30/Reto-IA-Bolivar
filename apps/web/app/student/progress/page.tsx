'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

interface Progress { topic: string; progress_percent: number }

export default function ProgressPage() {
  const [items, setItems] = useState<Progress[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    proxyJson<Progress[]>('/progress')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar progreso'));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Progreso por tema</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {items.length === 0 && !error && (
        <p className="text-zinc-500">Completa pasos en tus rutas de aprendizaje para ver progreso aquí.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p) => (
          <Card key={p.topic}>
            <div className="flex justify-between mb-2">
              <span className="font-medium capitalize">{p.topic.replace(/_/g, ' ')}</span>
              <span className="text-brand-amber">{p.progress_percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-brand-bg">
              <div className="h-2 rounded-full bg-brand-amber transition-all" style={{ width: `${p.progress_percent}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
