'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Label, Select, Badge } from '@/components/ui';
import { ActionOverlay } from '@/components/ui/ActionOverlay';
import { ROLE_LABELS } from '@/lib/utils';
import { Key, Copy } from 'lucide-react';
import { proxyJson } from '@/lib/proxy';
import { createClient } from '@/lib/supabase/client';
import { getSelectedInstitutionId } from '@/lib/institution-context';

interface AuthKey {
  id: string;
  role: string;
  label: string;
  max_uses: number;
  uses_count: number;
  expires_at?: string;
  revoked_at?: string;
  institutions?: { name: string };
}

export default function AuthKeysPage() {
  const [keys, setKeys] = useState<AuthKey[]>([]);
  const [newKey, setNewKey] = useState('');
  const [role, setRole] = useState('dean');
  const [institutionId, setInstitutionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('institution_id, role').eq('id', user.id).single();
        const inst = profile?.institution_id || getSelectedInstitutionId() || '';
        if (inst) setInstitutionId(inst);
      }
      await load();
    }
    init();
    const onChange = () => {
      const inst = getSelectedInstitutionId();
      if (inst) setInstitutionId(inst);
      load();
    };
    window.addEventListener('institution-context-changed', onChange);
    return () => window.removeEventListener('institution-context-changed', onChange);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await proxyJson<AuthKey[]>('/admin/auth-keys');
      setKeys(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar claves');
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!institutionId) {
      setError('No tiene institución asignada. Contacte al administrador de plataforma.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const data = await proxyJson<{ auth_key?: string }>('/admin/auth-keys', {
        method: 'POST',
        body: JSON.stringify({
          institution_id: institutionId,
          role,
          label: `Clave ${ROLE_LABELS[role]}`,
          max_uses: 5,
        }),
      });
      if (data.auth_key) setNewKey(data.auth_key);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar');
    } finally {
      setActionLoading(false);
    }
  }

  async function revoke(id: string) {
    setActionLoading(true);
    try {
      await proxyJson(`/admin/auth-keys/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al revocar');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ActionOverlay show={actionLoading} message="Procesando clave..." />
      <h2 className="text-2xl font-semibold">Claves de autorización</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card>
        <h3 className="font-semibold mb-4">Generar nueva clave</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Rol</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              {['area_head', 'dean', 'vice_president', 'rector'].map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button onClick={generate} disabled={actionLoading || !institutionId}>
              <Key className="mr-2 h-4 w-4" />{actionLoading ? 'Generando...' : 'Generar clave'}
            </Button>
          </div>
        </div>
        {newKey && (
          <div className="mt-4 rounded-lg bg-brand-amber/10 border border-brand-amber/30 p-4">
            <p className="text-sm text-brand-amber font-mono">{newKey}</p>
            <p className="text-xs text-zinc-500 mt-2">Guarde esta clave; no se mostrará de nuevo.</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => navigator.clipboard.writeText(newKey)}>
              <Copy className="mr-1 h-3 w-3" />Copiar
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <Card><p className="text-zinc-500">Cargando claves...</p></Card>
      ) : (
        <div className="space-y-3">
          {keys.length === 0 && <Card><p className="text-zinc-500">No hay claves generadas.</p></Card>}
          {keys.map((k) => (
            <Card key={k.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{k.label || k.role}</p>
                <div className="flex gap-2 mt-1">
                  <Badge>{ROLE_LABELS[k.role]}</Badge>
                  <Badge variant="default">{k.uses_count}/{k.max_uses} usos</Badge>
                  {k.revoked_at && <Badge variant="red">Revocada</Badge>}
                </div>
              </div>
              {!k.revoked_at && (
                <Button size="sm" variant="danger" onClick={() => revoke(k.id)} disabled={actionLoading}>Revocar</Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
