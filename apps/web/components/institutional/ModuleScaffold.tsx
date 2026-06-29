import { Card } from '@/components/ui';
import { BarChart3, TrendingUp, FileText, ClipboardList, Zap, Brain } from 'lucide-react';

const ICONS = { BarChart3, TrendingUp, FileText, ClipboardList, Zap, Brain };

export function ModuleScaffold({
  title,
  description,
  icon = 'BarChart3',
  children,
}: {
  title: string;
  description: string;
  icon?: keyof typeof ICONS;
  children?: React.ReactNode;
}) {
  const Icon = ICONS[icon];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-brand-amber/10 p-3">
          <Icon className="h-6 w-6 text-brand-amber" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-zinc-500">{description}</p>
        </div>
      </div>
      {children || (
        <Card>
          <p className="text-zinc-400">Módulo en modo demo con datos seed. Integración ERP diferida post-reto.</p>
        </Card>
      )}
    </div>
  );
}
