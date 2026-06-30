'use client';

import { useEffect, useState } from 'react';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { Badge } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

interface Action {
  title: string;
  priority: string;
  status: string;
}

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    proxyJson<Action[]>('/institutional/actions')
      .then((d) => setActions(Array.isArray(d) ? d : []))
      .catch(() => setActions([]));
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <h1 className="font-display mb-6 text-2xl font-bold">Acciones institucionales</h1>
      <BentoGrid cols={2}>
        {actions.map((a) => (
          <BentoCell key={a.title}>
            <div className="flex justify-between items-start gap-4">
              <p className="font-medium">{a.title}</p>
              <div className="flex gap-2 flex-shrink-0">
                <Badge variant={a.priority === 'high' ? 'red' : a.priority === 'medium' ? 'amber' : 'default'}>{a.priority}</Badge>
                <Badge>{a.status}</Badge>
              </div>
            </div>
          </BentoCell>
        ))}
      </BentoGrid>
    </div>
  );
}
