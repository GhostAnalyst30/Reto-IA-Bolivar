'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { GraduationCap } from 'lucide-react';

interface Curricula {
  id: string;
  title: string;
  file_url?: string;
}

interface Program {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  program_curricula?: Curricula[];
}

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    const data = await proxyJson<Program[]>('/admin/programs');
    setPrograms(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await proxyJson('/admin/programs', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    setName('');
    setDescription('');
    load();
  }

  async function remove(id: string) {
    await proxyJson(`/admin/programs/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Programas académicos UTB</h1>
        <p className="text-muted">Gestione programas disponibles para estudiantes y registro</p>
      </div>

      <PortalCard>
        <h2 className="font-medium mb-4">Agregar programa</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
          <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Descripción</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <Button type="submit" className="sm:col-span-2 w-fit">Guardar programa</Button>
        </form>
      </PortalCard>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programs.filter((p) => p.is_active !== false).map((p) => (
          <PortalCard key={p.id}>
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-[var(--portal-accent)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{p.name}</h3>
                {p.description && <p className="text-sm text-muted mt-1">{p.description}</p>}
                {p.program_curricula && p.program_curricula.length > 0 && (
                  <ul className="mt-2 text-xs text-muted space-y-1">
                    {p.program_curricula.map((c) => (
                      <li key={c.id}>
                        {c.file_url ? (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-[var(--portal-accent)] hover:underline">
                            {c.title}
                          </a>
                        ) : c.title}
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" variant="danger" className="mt-3" onClick={() => remove(p.id)}>Desactivar</Button>
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
