'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label, Select } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ClayFormCard } from '@/components/immersive/clay/ClayFormCard';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { ROLE_LABELS } from '@/lib/utils';
import { isUtbEmail } from '@/lib/utb-auth';

const ROLES = ['area_head', 'dean', 'vice_president', 'rector', 'admin'] as const;

export default function RegisterInstitutionalPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('dean');
  const [authKey, setAuthKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isUtbEmail(email)) {
      setError('Debes usar un correo @utb.edu.co');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register-institutional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          requested_role: role,
          auth_key: authKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrarse');
        setLoading(false);
        return;
      }

      sessionStorage.setItem(
        'pending_confirmation',
        JSON.stringify({ email, full_name: fullName, email_sent: data.email_sent !== false })
      );
      router.push(`/register/check-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  return (
    <ClayFormCard>
        <Link href="/" aria-label="Inicio"><UtbLogo /></Link>
        <h1 className="mt-6 font-display text-xl font-semibold text-brand-blue">Registro personal UTB</h1>
        <p className="mt-2 text-sm text-muted">
          Para personal institucional UTB. Requiere clave de registro emitida por el administrador de plataforma.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label>Nombre completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div><Label>Correo @utb.edu.co</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="director@utb.edu.co" required /></div>
          <div><Label htmlFor="password">Contraseña</Label><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
          <div>
            <Label>Rol solicitado</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)} required>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </div>
          <div><Label>Clave de registro</Label><Input value={authKey} onChange={(e) => setAuthKey(e.target.value)} required placeholder="Clave proporcionada por el administrador" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Registrando...' : 'Enviar solicitud'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted"><Link href="/login" className="text-brand-amber hover:underline">¿Ya tienes cuenta?</Link></p>
    </ClayFormCard>
  );
}
