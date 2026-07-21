'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, Select } from '@/components/ui';
import { PortalCard } from '@/components/portal/PortalCard';
import { proxyJson } from '@/lib/proxy';
import { Trash2, Pencil } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  topic?: string;
  category?: string;
  resource_type?: string;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await proxyJson<Resource[]>('/admin/resources');
      setResources(Array.isArray(data) ? data : []);
    } catch {
      setResources([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editId) {
        await proxyJson(`/admin/resources/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, description, url, topic, category }),
        });
      } else {
        await proxyJson('/admin/resources', {
          method: 'POST',
          body: JSON.stringify({ title, description, url, topic, category, resource_type: 'link' }),
        });
      }
      setTitle(''); setDescription(''); setUrl(''); setTopic(''); setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este recurso?')) return;
    await proxyJson(`/admin/resources/${id}`, { method: 'DELETE' });
    await load();
  }

  function startEdit(r: Resource) {
    setEditId(r.id);
    setTitle(r.title);
    setDescription(r.description || '');
    setUrl(r.url);
    setTopic(r.topic || '');
    setCategory(r.category || 'general');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Recursos y apoyo</h1>
          <p className="text-muted">Los estudiantes ven y acceden a estos recursos</p>
        </div>
      </div>

      <PortalCard>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} required /></div>
          <div className="sm:col-span-2"><Label>Descripción</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Tema</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
          <div>
            <Label>Categoría</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="biblioteca">Biblioteca</option>
              <option value="bienestar">Bienestar</option>
              <option value="academico">Académico</option>
            </Select>
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={loading}>{editId ? 'Actualizar' : 'Agregar recurso'}</Button>
            {editId && <Button type="button" variant="secondary" onClick={() => setEditId(null)}>Cancelar</Button>}
          </div>
        </form>
      </PortalCard>

      <div className="space-y-2">
        {resources.map((r) => (
          <PortalCard key={r.id} className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted truncate max-w-md">{r.description || r.url}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="secondary" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
