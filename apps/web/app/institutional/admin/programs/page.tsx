'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { BentoGrid, BentoCell } from '@/components/ui/BentoGrid';
import { proxyJson } from '@/lib/proxy';

interface Program {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
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
    <div>
      <h1 className="font-display mb-6 text-2xl font-bold">Programas académicos UTB</h1>
      <BentoGrid cols={2}>
        <BentoCell>
          <h2 className="font-medium mb-4">Agregar programa</h2>
          <form onSubmit={create} className="space-y-3">
            <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><Label>Descripción</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <Button type="submit">Guardar</Button>
          </form>
        </BentoCell>
        <BentoCell>
          <h2 className="font-medium mb-4">Programas activos</h2>
          <ul className="space-y-2">
            {programs.filter((p) => p.is_active !== false).map((p) => (
              <li key={p.id} className="flex justify-between items-center rounded-lg border border-brand-border p-3 text-sm">
                <span>{p.name}</span>
                <Button size="sm" variant="danger" onClick={() => remove(p.id)}>Quitar</Button>
              </li>
            ))}
          </ul>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
