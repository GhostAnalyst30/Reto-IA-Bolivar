import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Card } from '@/components/ui';

export default function ExecutiveSummaryPage() {
  return (
    <ModuleScaffold title="Resumen ejecutivo" description="Informe consolidado para directivos" icon="ClipboardList">
      <Card className="prose prose-invert max-w-none">
        <h3 className="text-lg font-semibold text-white">Resumen Q4 2025</h3>
        <p className="text-zinc-400 mt-4 leading-relaxed">
          La institución mantiene una retención del 87.5%, superando la meta del 85%. La satisfacción estudiantil
          alcanzó 4.2/5. Se recomienda invertir en tutoría IA para reducir deserción en primer semestre.
        </p>
        <ul className="mt-4 space-y-2 text-zinc-400">
          <li>• Fortalecer programa de investigación (+12 papers vs meta)</li>
          <li>• Optimizar ejecución presupuestal en infraestructura</li>
          <li>• Expandir portal estudiante a todas las facultades</li>
        </ul>
      </Card>
    </ModuleScaffold>
  );
}
