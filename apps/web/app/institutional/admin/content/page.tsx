'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';

interface Opportunity {
  id: string;
  type: string;
  title: string;
  area?: string;
  deadline?: string;
  is_active: boolean;
}

export default function AdminContentPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [form, setForm] = useState({
    type: 'beca',
    title: '',
    description: '',
    area: 'general',
    deadline: '',
    external_url: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    proxyJson<Opportunity[]>('/opportunities/admin/list').then(setOpps).catch(() => setOpps([]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await proxyJson('/opportunities/admin', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        requirements: [],
        tags: [form.area],
      }),
    });
    setForm({ type: 'beca', title: '', description: '', area: 'general', deadline: '', external_url: '' });
    load();
    setLoading(false);
  }

  async function remove(id: string) {
    await proxyJson(`/opportunities/admin/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Gestión de oportunidades</h1>

      <Card>
        <h2 className="font-semibold mb-4">Nueva oportunidad</h2>
        <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="beca">Beca</option>
              <option value="convocatoria">Convocatoria</option>
              <option value="evento">Evento</option>
            </Select>
          </div>
          <div>
            <Label>Área</Label>
            <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Fecha límite</Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <Label>URL externa</Label>
            <Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading}>Crear</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {opps.map((o) => (
          <Card key={o.id} className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase text-brand-amber">{o.type}</span>
              <p className="font-medium">{o.title}</p>
              {o.deadline && <p className="text-xs text-zinc-500">Límite: {o.deadline}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove(o.id)}>Desactivar</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
