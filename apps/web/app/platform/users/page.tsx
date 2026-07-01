'use client';

import { useEffect, useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { proxyJson } from '@/lib/proxy';
import { ROLE_LABELS } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  institution_id: string | null;
  institutions?: { name: string } | null;
}

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    proxyJson<UserRow[]>('/platform/users')
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Todos los usuarios</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <p className="text-zinc-500">Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <Card><p className="text-zinc-500">No hay usuarios registrados.</p></Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold">{u.full_name || u.email}</p>
                  <p className="text-sm text-zinc-500">{u.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="amber">{ROLE_LABELS[u.role] || u.role}</Badge>
                  <Badge variant={u.status === 'approved' ? 'green' : u.status === 'pending' ? 'amber' : 'red'}>
                    {u.status}
                  </Badge>
                  {u.institutions?.name ? (
                    <Badge>{u.institutions.name}</Badge>
                  ) : (
                    <Badge variant="red">Sin institución</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
