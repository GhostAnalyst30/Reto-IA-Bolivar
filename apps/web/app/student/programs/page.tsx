'use client';

import { useEffect, useState } from 'react';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { GraduationCap, ExternalLink } from 'lucide-react';

interface Curricula {
  id: string;
  title: string;
  file_url?: string;
}

interface Program {
  id: string;
  name: string;
  description?: string;
  program_curricula?: Curricula[];
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    proxyJson<Program[]>('/programs')
      .then((d) => setPrograms(Array.isArray(d) ? d : []))
      .catch(() => setPrograms([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Programas académicos UTB</h1>
        <p className="text-muted">Consulta la información de los programas de la universidad</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {programs.map((p) => (
          <PortalCard key={p.id}>
            <div className="flex items-start gap-3">
              <GraduationCap className="h-6 w-6 text-brand-amber shrink-0" />
              <div>
                <h2 className="font-semibold text-lg">{p.name}</h2>
                {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
                {p.program_curricula && p.program_curricula.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {p.program_curricula.map((c) => (
                      <li key={c.id} className="text-sm">
                        {c.file_url ? (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-amber hover:underline">
                            {c.title} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : c.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </PortalCard>
        ))}
        {programs.length === 0 && (
          <PortalCard className="md:col-span-2">
            <p className="text-muted">No hay programas disponibles. Contacte al administrador.</p>
          </PortalCard>
        )}
      </div>
    </div>
  );
}
