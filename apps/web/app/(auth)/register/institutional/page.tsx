'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/utils';

interface Institution { id: string; name: string; }

const ROLES = ['area_head', 'dean', 'vice_president', 'rector'] as const;

export default function RegisterInstitutionalPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [role, setRole] = useState<string>('dean');
  const [authKey, setAuthKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch(`${API_URL}/institutions`).then((r) => r.json()).then(setInstitutions).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Error al registrarse');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register/institutional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user.id, email, full_name: fullName,
          institution_id: institutionId, requested_role: role, auth_key: authKey,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Clave de autorización inválida');
        setLoading(false);
        return;
      }
      router.push('/pending-approval');
    } catch {
      setError('Error al crear solicitud');
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-bold">Bolívar<span className="text-brand-amber">IA</span></Link>
        <h1 className="mt-6 text-xl font-semibold">Registro institucional</h1>
        <p className="mt-2 text-sm text-zinc-500">Requiere clave de autorización emitida por el administrador.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label>Nombre completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
          <div>
            <Label>Institución</Label>
            <Select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Rol solicitado</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)} required>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </div>
          <div><Label>Clave de autorización (auth_key)</Label><Input value={authKey} onChange={(e) => setAuthKey(e.target.value)} required placeholder="BOL-DEA-..." /></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Registrando...' : 'Enviar solicitud'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500"><Link href="/login" className="text-brand-amber">¿Ya tienes cuenta?</Link></p>
      </Card>
    </div>
  );
}
