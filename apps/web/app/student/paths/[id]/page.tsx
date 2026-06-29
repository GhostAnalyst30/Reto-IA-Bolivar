'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, Badge } from '@/components/ui';
import { CheckCircle2, Circle } from 'lucide-react';

export default function PathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [path, setPath] = useState<{ title: string; topic: string; learning_path_steps: { title: string; step_order: number; completed: boolean }[] } | null>(null);

  useEffect(() => {
    fetch(`/api/proxy?path=/paths/${id}`).then((r) => r.json()).then(setPath);
  }, [id]);

  if (!path) return <p className="text-zinc-500">Cargando...</p>;

  const steps = [...(path.learning_path_steps || [])].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{path.title}</h2>
        <Badge className="mt-2">{path.topic}</Badge>
      </div>
      <Card>
        <h3 className="font-semibold mb-4">Pasos de la ruta</h3>
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.step_order} className="flex items-start gap-3">
              {s.completed ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Circle className="h-5 w-5 text-zinc-600" />}
              <div>
                <p className="font-medium">{s.step_order}. {s.title}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
