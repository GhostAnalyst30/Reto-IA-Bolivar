import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Card } from '@/components/ui';

export default function PredictionPage() {
  return (
    <ModuleScaffold title="Predicción" description="Modelos de retención y deserción (demo)" icon="TrendingUp">
      <Card>
        <h3 className="font-semibold">Predicción de retención — Semestre 2026-1</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div><p className="text-sm text-zinc-500">Riesgo alto</p><p className="text-2xl font-bold text-red-400">12%</p></div>
          <div><p className="text-sm text-zinc-500">Riesgo medio</p><p className="text-2xl font-bold text-yellow-400">23%</p></div>
          <div><p className="text-sm text-zinc-500">Estable</p><p className="text-2xl font-bold text-green-400">65%</p></div>
        </div>
      </Card>
    </ModuleScaffold>
  );
}
