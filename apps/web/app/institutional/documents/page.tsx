import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Card } from '@/components/ui';

const DOCS = [
  { title: 'Plan de desarrollo 2026', type: 'PDF', date: '2026-01-15' },
  { title: 'Informe acreditación', type: 'DOCX', date: '2025-11-20' },
  { title: 'Acta consejo académico', type: 'PDF', date: '2026-02-01' },
];

export default function DocumentsPage() {
  return (
    <ModuleScaffold title="Gestión documental" description="Repositorio institucional (scaffold)" icon="FileText">
      <div className="space-y-3">
        {DOCS.map((d) => (
          <Card key={d.title} className="flex justify-between items-center py-4">
            <div><p className="font-medium">{d.title}</p><p className="text-xs text-zinc-500">{d.date}</p></div>
            <span className="text-xs rounded bg-brand-bg px-2 py-1">{d.type}</span>
          </Card>
        ))}
      </div>
    </ModuleScaffold>
  );
}
