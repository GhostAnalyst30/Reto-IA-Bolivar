'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Label } from '@/components/ui';
import { BookOpen, Plus } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';

interface Path {
  id: string;
  title: string;
  topic: string;
  status: string;
  learning_path_steps?: { id: string; title: string; step_order: number; completed: boolean }[];
}

interface ProgressRow {
  topic: string;
  progress_percent: number;
}

export default function PathsPage() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [pathsData, progressData] = await Promise.all([
        proxyJson<Path[]>('/paths'),
        proxyJson<ProgressRow[]>('/progress'),
      ]);
      setPaths(Array.isArray(pathsData) ? pathsData : []);
      setProgress(Array.isArray(progressData) ? progressData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar rutas');
    }
  }

  function pathProgress(p: Path): number {
    const steps = p.learning_path_steps || [];
    if (steps.length === 0) {
      const row = progress.find((pr) => pr.topic === p.topic);
      return row?.progress_percent ?? 0;
    }
    const done = steps.filter((s) => s.completed).length;
    return Math.round((done / steps.length) * 100);
  }

  async function createPath(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      await proxyJson('/paths', { method: 'POST', body: JSON.stringify({ topic }) });
      setTopic('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar ruta');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Rutas de aprendizaje</h1>
        <p className="text-muted">Rutas estructuradas con progreso integrado</p>
      </div>

      <Card>
        <h2 className="font-semibold">Generar ruta de aprendizaje</h2>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={createPath} className="mt-4 flex gap-3">
          <div className="flex-1">
            <Label>Tema</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: programación, machine learning..." />
          </div>
          <Button type="submit" className="self-end" disabled={loading}><Plus className="mr-1 h-4 w-4" />{loading ? 'Generando...' : 'Crear ruta'}</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {paths.map((p) => {
          const pct = pathProgress(p);
          return (
            <Link key={p.id} href={`/student/paths/${p.id}`}>
              <Card className="hover:border-brand-amber/40 transition-colors cursor-pointer h-full">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-brand-amber mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{p.learning_path_steps?.length || 0} pasos · {p.status}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted mb-1">
                        <span>Progreso</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-brand-border overflow-hidden">
                        <div className="h-full bg-brand-amber transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
