'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Label } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { BentoCell } from '@/components/ui/BentoGrid';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { getDefaultPath } from '@/lib/utils';
import { registerUserSession } from '@/lib/session-client';
import { cn } from '@/lib/utils';

type PortalType = 'student' | 'institutional';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const initialPortal = (searchParams.get('portal') === 'institutional' ? 'institutional' : 'student') as PortalType;
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const p = searchParams.get('portal');
    if (p === 'institutional' || p === 'student') setPortal(p);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const lookupRes = await fetch(`/api/auth/lookup-username?username=${encodeURIComponent(username.trim())}`);
    if (!lookupRes.ok) {
      setError('Usuario o contraseña incorrectos');
      setLoading(false);
      return;
    }
    const { email } = await lookupRes.json();

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Usuario o contraseña incorrectos');
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
      await registerUserSession(profile.role);
      router.push(getDefaultPath(profile.role));
    } else {
      router.push('/pending-approval');
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <BentoCell animate={false} className="relative w-full max-w-md">
        <Link href="/" aria-label="Inicio">
          <UtbLogo />
        </Link>
        <p className="mt-2 text-sm text-muted">
          {portal === 'student'
            ? 'Microservicio de acompañamiento estudiantil UTB'
            : 'Portal institucional — personal autorizado UTB'}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-sm border border-brand-border p-1">
          <button
            type="button"
            onClick={() => setPortal('student')}
            className={cn(
              'rounded-sm px-3 py-2 text-sm font-medium transition-colors',
              portal === 'student' ? 'bg-brand-blue text-white' : 'text-muted hover:text-foreground'
            )}
          >
            Soy estudiante
          </button>
          <button
            type="button"
            onClick={() => setPortal('institutional')}
            className={cn(
              'rounded-sm px-3 py-2 text-sm font-medium transition-colors',
              portal === 'institutional' ? 'bg-brand-blue text-white' : 'text-muted hover:text-foreground'
            )}
          >
            Personal UTB
          </button>
        </div>

        <h1 className="mt-6 font-display text-xl font-semibold text-brand-blue">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ej. juan_perez"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-brand-blue-mid hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-6 space-y-2 text-center text-sm text-muted">
          {portal === 'student' ? (
            <p><Link href="/register/student" className="text-brand-amber hover:underline">Registro estudiante</Link></p>
          ) : (
            <p><Link href="/register/institutional" className="text-brand-amber hover:underline">Registro personal institucional</Link></p>
          )}
        </div>
      </BentoCell>
    </div>
  );
}
