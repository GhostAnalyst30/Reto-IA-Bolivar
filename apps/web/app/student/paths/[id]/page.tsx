'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, Badge, Button } from '@/components/ui';
import { CheckCircle2, Circle } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface Step { id: string; title: string; step_order: number; completed: boolean }

export default function PathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [path, setPath] = useState<{ title: string; topic: string; learning_path_steps: Step[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const data = await proxyJson<{ title: string; topic: string; learning_path_steps: Step[] }>(`/paths/${id}`);
      if (data && 'title' in data) setPath(data);
      else setError('Ruta no encontrada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar ruta');
    }
  }

  async function completeStep(stepId: string) {
    try {
      await proxyJson(`/paths/${id}/steps/${stepId}`, { method: 'PATCH', body: '{}' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al marcar paso');
    }
  }

  if (error && !path) return <p className="text-red-400">{error}</p>;
  if (!path) return <p className="text-zinc-500">Cargando...</p>;

  const steps = [...(path.learning_path_steps || [])].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{path.title}</h2>
        <Badge className="mt-2">{path.topic}</Badge>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Card>
        <h3 className="font-semibold mb-4">Pasos de la ruta</h3>
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {s.completed ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Circle className="h-5 w-5 text-zinc-600" />}
                <p className="font-medium">{s.step_order}. {s.title}</p>
              </div>
              {!s.completed && (
                <Button size="sm" variant="secondary" onClick={() => completeStep(s.id)}>Completar</Button>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
