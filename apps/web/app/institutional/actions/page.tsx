import { ModuleScaffold } from '@/components/institutional/ModuleScaffold';
import { Card, Badge } from '@/components/ui';

const ACTIONS = [
  { title: 'Programa tutoría primer semestre', priority: 'high', status: 'pending' },
  { title: 'Revisión currículo ingeniería', priority: 'medium', status: 'in_progress' },
  { title: 'Contratación docente tiempo completo', priority: 'high', status: 'pending' },
];

export default function ActionsPage() {
  return (
    <ModuleScaffold title="Acciones institucionales" description="Recomendaciones y seguimiento" icon="Zap">
      <div className="space-y-3">
        {ACTIONS.map((a) => (
          <Card key={a.title} className="flex justify-between items-center">
            <p className="font-medium">{a.title}</p>
            <div className="flex gap-2">
              <Badge variant={a.priority === 'high' ? 'red' : 'amber'}>{a.priority}</Badge>
              <Badge>{a.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </ModuleScaffold>
  );
}
