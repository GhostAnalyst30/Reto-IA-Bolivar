'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label, Select } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { BentoCell } from '@/components/ui/BentoGrid';
import { proxyJson } from '@/lib/proxy';

interface Institution {
  id: string;
  name: string;
  slug: string;
}

const DEFAULT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_SLUG || 'utb';

export default function RegisterStudentPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [linkLater, setLinkLater] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/institutions')
      .then((r) => r.json())
      .then((data: Institution[]) => {
        setInstitutions(data);
        const utb = data.find((i) => i.slug === DEFAULT_SLUG);
        if (utb) setInstitutionId(utb.id);
      })
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
          institution_id: linkLater ? null : institutionId || null,
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
      <BentoCell animate={false} className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-bold">Bolívar<span className="text-brand-amber">IA</span></Link>
        <h1 className="mt-6 text-xl font-semibold">Registro estudiante</h1>
        <p className="mt-2 text-sm text-zinc-500">Universidad Tecnológica de Bolívar por defecto. Puede vincular después.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label htmlFor="name">Nombre completo</Label><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div><Label htmlFor="email">Correo</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="password">Contraseña</Label><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input type="checkbox" checked={linkLater} onChange={(e) => setLinkLater(e.target.checked)} />
            Vincular institución después del registro
          </label>
          {!linkLater && (
            <div>
              <Label htmlFor="inst">Institución</Label>
              <Select id="inst" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Registrando...' : 'Enviar solicitud'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500"><Link href="/login" className="text-brand-amber">¿Ya tienes cuenta?</Link></p>
      </BentoCell>
    </div>
  );
}
