'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Input, Label } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { getDefaultPath } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Credenciales inválidas');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', data.user.id)
      .single();

    if (profile?.status === 'pending' || profile?.status === 'rejected') {
      router.push('/pending-approval');
    } else if (profile?.status === 'approved') {
      router.push(getDefaultPath(profile.role));
    } else {
      router.push('/pending-approval');
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1A2744_0%,_transparent_70%)]" />
      <Card className="relative w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-bold">
          Bolívar<span className="text-brand-amber">IA</span>
        </Link>
        <h1 className="mt-6 text-xl font-semibold">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-6 space-y-2 text-center text-sm text-zinc-500">
          <p><Link href="/register/student" className="text-brand-amber hover:underline">Registro estudiante</Link></p>
          <p><Link href="/register/institutional" className="text-brand-amber hover:underline">Registro institucional</Link></p>
        </div>
      </Card>
    </div>
  );
}
