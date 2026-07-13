'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Label } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ClayFormCard } from '@/components/immersive/clay/ClayFormCard';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { getDefaultPath } from '@/lib/utils';
import { registerUserSession } from '@/lib/session-client';
import { cn } from '@/lib/utils';
import { useAuthTransition } from '@/contexts/AuthTransitionContext';
import { mapSupabaseAuthError } from '@/lib/auth-transition';

type PortalType = 'student' | 'institutional';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const initialPortal = (searchParams.get('portal') === 'institutional' ? 'institutional' : 'student') as PortalType;
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const {
    startTransition,
    setStepActive,
    completeStep,
    skipStep,
    failStep,
    finishTransition,
    resetTransition,
    isActive: transitionActive,
  } = useAuthTransition();

  useEffect(() => {
    const p = searchParams.get('portal');
    if (p === 'institutional' || p === 'student') setPortal(p);
  }, [searchParams]);

  useEffect(() => {
    const authError = searchParams.get('error');
    if (authError === 'confirmacion') {
      setError('No se pudo confirmar tu cuenta. Solicita un nuevo enlace de confirmación.');
    }
    const message = searchParams.get('message');
    if (message === 'already_approved') {
      setError('Tu cuenta ya está aprobada. Inicia sesión con tu correo y contraseña.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!transitionActive) {
      setLoading(false);
    }
  }, [transitionActive]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    resetTransition();
    startTransition();

    const normalizedEmail = email.trim().toLowerCase();

    try {
      setStepActive('auth');
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        const message = mapSupabaseAuthError(authError.message);
        failStep('auth', message);
        setError(message);
        return;
      }

      if (!data.user) {
        const message = 'No se pudo iniciar sesión. Inténtalo de nuevo.';
        failStep('auth', message);
        setError(message);
        return;
      }

      completeStep('auth');

      setStepActive('profile');
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        const message = 'Perfil no encontrado. Contacta al administrador de la plataforma.';
        failStep('profile', message);
        setError(message);
        return;
      }

      completeStep('profile');

      if (profile.status === 'pending' || profile.status === 'rejected') {
        setStepActive('navigate');
        router.push('/pending-approval');
        router.refresh();
        completeStep('navigate');
        finishTransition();
        return;
      }

      if (profile.status !== 'approved') {
        const message = 'Tu cuenta no tiene acceso activo. Contacta al administrador.';
        failStep('profile', message);
        setError(message);
        return;
      }

      setStepActive('session');
      const sessionResult = await registerUserSession(profile.role);
      if (sessionResult.timedOut || !sessionResult.ok) {
        skipStep('session');
      } else {
        completeStep('session');
      }

      setStepActive('navigate');
      setStepActive('portal');
      router.push(getDefaultPath(profile.role));
      router.refresh();
      completeStep('navigate');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión';
      failStep('auth', message);
      setError(message);
    }
  }

  return (
    <ClayFormCard>
        <Link href="/" aria-label="Inicio">
          <UtbLogo />
        </Link>
        <p className="mt-2 text-sm text-muted">
          {portal === 'student'
            ? 'Microservicio de acompañamiento estudiantil UTB'
            : 'Portal institucional — personal autorizado UTB'}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-[var(--public-radius-md)] border border-brand-border p-1 clay-input">
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
            <Label htmlFor="email">Correo institucional</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@utb.edu.co"
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
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
              {error.includes('Confirma tu correo') && (
                <>
                  {' '}
                  <Link href={`/register/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`} className="underline">
                    Reenviar confirmación
                  </Link>
                </>
              )}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading || transitionActive}>
            {loading || transitionActive ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-6 space-y-2 text-center text-sm text-muted">
          {portal === 'student' ? (
            <p><Link href="/register/student" className="text-brand-amber hover:underline">Registro estudiante</Link></p>
          ) : (
            <p><Link href="/register/institutional" className="text-brand-amber hover:underline">Registro personal institucional</Link></p>
          )}
        </div>
    </ClayFormCard>
  );
}
