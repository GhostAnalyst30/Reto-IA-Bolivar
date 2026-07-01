'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Badge } from '@/components/ui';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { proxyJson } from '@/lib/proxy';

interface Institution {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export default function PlatformInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    manager_email: '',
    manager_password: '',
    manager_full_name: '',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await proxyJson<Institution[]>('/platform/institutions');
      setInstitutions(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      await proxyJson('/platform/institutions', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: '', slug: '', manager_email: '', manager_password: '', manager_full_name: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    setActionLoading(true);
    try {
      await proxyJson(`/platform/institutions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !is_active }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ActionOverlay show={actionLoading} message="Guardando institución..." />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Instituciones</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nueva institución'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {showForm && (
        <Card>
          <h3 className="font-semibold">Crear institución y gestor</h3>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Nombre institución</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="slug">Slug (ej. utb)</Label>
              <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="utb" />
            </div>
            <div>
              <Label htmlFor="mgr_name">Nombre del gestor</Label>
              <Input id="mgr_name" value={form.manager_full_name} onChange={(e) => setForm({ ...form, manager_full_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="mgr_email">Email gestor (ej. utb@utb.demo)</Label>
              <Input id="mgr_email" type="email" value={form.manager_email} onChange={(e) => setForm({ ...form, manager_email: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="mgr_pass">Contraseña gestor</Label>
              <Input id="mgr_pass" type="password" value={form.manager_password} onChange={(e) => setForm({ ...form, manager_password: e.target.value })} required minLength={8} />
            </div>
            <Button type="submit" disabled={actionLoading}>Crear institución</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando instituciones...</p>
      ) : institutions.length === 0 ? (
        <Card><p className="text-zinc-500">No hay instituciones registradas. Crea la primera desde el formulario.</p></Card>
      ) : (
        institutions.map((inst) => (
          <Card key={inst.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{inst.name}</p>
                <p className="text-sm text-zinc-500">{inst.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inst.is_active ? 'green' : 'red'}>{inst.is_active ? 'Activa' : 'Inactiva'}</Badge>
                <Button size="sm" variant="secondary" onClick={() => toggleActive(inst.id, inst.is_active)}>
                  {inst.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
