'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { API_URL } from '@/lib/api';

interface Institution {
  id: string;
  name: string;
  slug: string;
}

export default function RegisterStudentPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/institutions`)
      .then((r) => r.json())
      .then(setInstitutions)
      .catch(() => setInstitutions([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          institution_id: institutionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrarse');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('pending_confirmation', JSON.stringify({ email, full_name: fullName }));
      router.push(`/register/check-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-bold">Bolívar<span className="text-brand-amber">IA</span></Link>
        <h1 className="mt-6 text-xl font-semibold">Registro estudiante</h1>
        <p className="mt-2 text-sm text-zinc-500">Tu solicitud será revisada por el administrador institucional.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label htmlFor="name">Nombre completo</Label><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div><Label htmlFor="email">Correo</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="password">Contraseña</Label><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
          <div>
            <Label htmlFor="inst">Institución</Label>
            <Select id="inst" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Registrando...' : 'Enviar solicitud'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500"><Link href="/login" className="text-brand-amber">¿Ya tienes cuenta?</Link></p>
      </Card>
    </div>
  );
}
