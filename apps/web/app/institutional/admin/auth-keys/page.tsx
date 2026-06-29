'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Select, Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/utils';
import { Key, Copy } from 'lucide-react';

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
  const [institutionId, setInstitutionId] = useState('a0000000-0000-4000-8000-000000000001');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch('/api/proxy?path=/admin/auth-keys');
    setKeys(await res.json());
  }

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/proxy?path=/admin/auth-keys', {
      method: 'POST',
      body: JSON.stringify({ institution_id: institutionId, role, label: `Clave ${ROLE_LABELS[role]}`, max_uses: 5 }),
    });
    const data = await res.json();
    if (data.auth_key) setNewKey(data.auth_key);
    await load();
    setLoading(false);
  }

  async function revoke(id: string) {
    await fetch(`/api/proxy?path=/admin/auth-keys/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Claves de autorización</h2>

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
            <Button onClick={generate} disabled={loading}><Key className="mr-2 h-4 w-4" />{loading ? 'Generando...' : 'Generar clave'}</Button>
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

      <div className="space-y-3">
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
              <Button size="sm" variant="danger" onClick={() => revoke(k.id)}>Revocar</Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
