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

export default function PathsPage() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await proxyJson<Path[]>('/paths');
      setPaths(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar rutas');
    }
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
        {paths.map((p) => (
          <Link key={p.id} href={`/student/paths/${p.id}`}>
            <Card className="hover:border-brand-amber/40 transition-colors cursor-pointer h-full">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-brand-amber mt-0.5" />
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{p.learning_path_steps?.length || 0} pasos · {p.status}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
