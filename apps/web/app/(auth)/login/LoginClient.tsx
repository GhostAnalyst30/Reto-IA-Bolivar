'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, AtSign, Eye, EyeOff, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getDefaultPath, cn } from '@/lib/utils';
import { registerUserSession } from '@/lib/session-client';
import { useAuthTransition } from '@/contexts/AuthTransitionContext';
import { mapSupabaseAuthError } from '@/lib/auth-transition';
import { BrandMark } from '@/components/front/brand-mark';
import { ShaderBackground } from '@/components/front/shader-background';

type PortalType = 'student' | 'institutional';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const initialPortal = (
    searchParams.get('portal') === 'institutional' ? 'institutional' : 'student'
  ) as PortalType;
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
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
    if (!transitionActive) setLoading(false);
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

  const busy = loading || transitionActive;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="fixed inset-0 z-0">
        <ShaderBackground className="absolute inset-0 h-full w-full" />
      </div>

      <div className="glass-card fade-in-up relative z-10 flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[24px] md:flex-row">
        <div className="relative hidden flex-col justify-end overflow-hidden bg-[#002576] p-12 md:flex md:w-5/12">
          <div className="absolute inset-0 z-0 opacity-45 grayscale transition-all duration-700 hover:grayscale-0">
            <Image
              src="/front/students-campus.png"
              alt="Estudiantes de la UTB en el campus"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 0px, 40vw"
              priority
            />
          </div>
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
          <div className="relative z-20">
            <div className="mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 p-2 backdrop-blur">
                <Image
                  src="/front/utb-logo.png"
                  alt="Logo UTB"
                  width={30}
                  height={30}
                  className="h-full w-full object-contain brightness-0 invert"
                />
              </div>
            </div>
            <h1 className="mb-4 text-balance text-3xl font-bold leading-tight text-white">
              UTB Te Acompaña
            </h1>
            <p className="mb-8 leading-relaxed text-white/80">
              Tu portal universitario inteligente para el éxito académico y el bienestar integral.
            </p>
            <div className="flex gap-2">
              <span className="h-2 w-2 rounded-full bg-white" />
              <span className="h-2 w-2 rounded-full bg-white/30" />
              <span className="h-2 w-2 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center p-8 md:w-7/12 md:p-14">
          <BrandMark className="mb-8 md:hidden" />

          <div className="mb-10">
            <h2 className="mb-2 text-2xl font-bold text-on-surface">¡Hola de nuevo!</h2>
            <p className="text-on-surface-variant">Ingresa tus credenciales para continuar.</p>
          </div>

          <div className="relative mb-10 flex w-full rounded-xl bg-surface-container-low p-1">
            <span
              className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out dark:bg-surface-container-highest"
              style={{
                transform: portal === 'institutional' ? 'translateX(100%)' : 'translateX(0)',
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setPortal('student')}
              className={cn(
                'relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors',
                portal === 'student' ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              Soy Estudiante
            </button>
            <button
              type="button"
              onClick={() => setPortal('institutional')}
              className={cn(
                'relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors',
                portal === 'institutional' ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              Personal UTB
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="mb-2 ml-1 block text-sm font-semibold text-on-surface-variant"
              >
                {portal === 'institutional'
                  ? 'Usuario Administrativo / Docente'
                  : 'Correo Institucional'}
              </label>
              <div className="group relative">
                <AtSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@utb.edu.co"
                  className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-3.5 pl-12 pr-4 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 ml-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-on-surface-variant"
                >
                  Contraseña
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-3.5 pl-12 pr-12 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded border-outline-variant text-primary accent-primary focus:ring-primary/20"
              />
              <label
                htmlFor="remember"
                className="cursor-pointer select-none text-on-surface-variant"
              >
                Mantener sesión iniciada
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
                {error.includes('Confirma tu correo') && (
                  <>
                    {' '}
                    <Link
                      href={`/register/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                      className="underline"
                    >
                      Reenviar confirmación
                    </Link>
                  </>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary-container active:scale-[0.98] disabled:opacity-70"
            >
              {busy ? 'Ingresando…' : 'Iniciar Sesión'}
              {!busy && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-outline-variant/30" />
            <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant/60">
              O registra
            </span>
            <div className="h-px flex-1 bg-outline-variant/30" />
          </div>

          <div className="mt-8 text-center text-sm text-on-surface-variant">
            {portal === 'student' ? (
              <Link href="/register/student" className="font-bold text-primary hover:underline">
                Registro estudiante
              </Link>
            ) : (
              <Link
                href="/register/institutional"
                className="font-bold text-primary hover:underline"
              >
                Registro personal institucional
              </Link>
            )}
          </div>

          <p className="mt-8 text-center text-on-surface-variant">
            ¿Problemas para ingresar?{' '}
            <a href="mailto:soporte@utb.edu.co" className="font-bold text-primary hover:underline">
              Soporte Técnico
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
