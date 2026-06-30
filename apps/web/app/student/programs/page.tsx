'use client';

import { useEffect, useState } from 'react';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { proxyJson } from '@/lib/proxy';

interface Program {
  id: string;
  name: string;
  description?: string;
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    proxyJson<Program[]>('/programs')
      .then((d) => setPrograms(Array.isArray(d) ? d : []))
      .catch(() => setPrograms([]));
  }, []);

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-bold">Programas académicos UTB</h1>
      <BentoGrid cols={2}>
        {programs.map((p) => (
          <BentoCell key={p.id}>
            <h2 className="font-semibold">{p.name}</h2>
            {p.description && <p className="mt-2 text-sm text-zinc-500">{p.description}</p>}
          </BentoCell>
        ))}
        {programs.length === 0 && (
          <BentoCell colSpan={2}>
            <p className="text-zinc-500">No hay programas disponibles. Vincule su institución o contacte al administrador.</p>
          </BentoCell>
        )}
      </BentoGrid>
    </div>
  );
}
