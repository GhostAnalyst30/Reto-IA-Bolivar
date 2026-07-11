'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Button } from '@/components/ui';
import { ClayFormCard } from '@/components/immersive/clay/ClayFormCard';
import { motion } from 'framer-motion';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { AuthLoadingFallback } from '@/components/immersive/layout/AuthLoadingFallback';
import { Mail } from 'lucide-react';

const COOLDOWN_MS = 60_000;

type PendingConfirmation = {
  email: string;
  full_name: string;
  email_sent?: boolean;
  auto_retried?: boolean;
  last_sent_at?: number;
};

function updatePending(patch: Partial<PendingConfirmation>) {
  const stored = sessionStorage.getItem('pending_confirmation');
  if (!stored) return;
  const current = JSON.parse(stored) as PendingConfirmation;
  sessionStorage.setItem('pending_confirmation', JSON.stringify({ ...current, ...patch }));
}

function CheckEmailContent() {
  const params = useSearchParams();
  const emailParam = params.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const autoRetryAttempted = useRef(false);

  const sendConfirmation = useCallback(async (payload: PendingConfirmation) => {
    const res = await fetch('/api/auth/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email || email,
        full_name: payload.full_name,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.detail || 'No se pudo enviar el correo');
    }
    const now = Date.now();
    updatePending({ email_sent: true, last_sent_at: now });
    setEmailSent(true);
    setResent(true);
    setResendDisabled(true);
    setCooldownLeft(COOLDOWN_MS);
    return data;
  }, [email]);

  useEffect(() => {
    const stored = sessionStorage.getItem('pending_confirmation');
    if (!stored) {
      setEmailSent(null);
      return;
    }

    const payload = JSON.parse(stored) as PendingConfirmation;
    if (payload.email) setEmail(payload.email);
    setEmailSent(payload.email_sent ?? null);

    if (payload.last_sent_at) {
      const elapsed = Date.now() - payload.last_sent_at;
      if (elapsed < COOLDOWN_MS) {
        setResendDisabled(true);
        setCooldownLeft(COOLDOWN_MS - elapsed);
      } else {
        setResendDisabled(false);
      }
    } else if (payload.email_sent) {
      setResendDisabled(true);
    }

    if (payload.email_sent || payload.auto_retried || autoRetryAttempted.current) return;

    autoRetryAttempted.current = true;
    if (payload.email_sent === false) {
      setAutoRetrying(true);
      updatePending({ auto_retried: true });
      sendConfirmation(payload)
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'No se pudo reenviar automáticamente');
        })
        .finally(() => setAutoRetrying(false));
    }
  }, [sendConfirmation]);

  useEffect(() => {
    if (cooldownLeft <= 0) {
      if (emailSent) setResendDisabled(false);
      return;
    }
    const timer = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft, emailSent]);

  async function resend() {
    if (resendDisabled || cooldownLeft > 0) return;
    setError('');
    const stored = sessionStorage.getItem('pending_confirmation');
    if (!stored) {
      setError('Vuelve a registrarte para reenviar el correo.');
      return;
    }
    try {
      await sendConfirmation(JSON.parse(stored) as PendingConfirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  }

  const showFailure = emailSent === false && !autoRetrying && !resent;
  const cooldownSecs = Math.ceil(cooldownLeft / 1000);

  return (
    <ClayFormCard className="text-center">
        <Link href="/" className="mx-auto mb-6 inline-block" aria-label="Inicio">
          <UtbLogo />
        </Link>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Mail className="mx-auto h-12 w-12 text-brand-amber" />
        </motion.div>
        <h1 className="font-display mt-4 text-2xl font-semibold text-brand-blue">Revisa tu correo</h1>

        {autoRetrying ? (
          <p className="mt-3 text-muted">Reintentando envío del correo de confirmación…</p>
        ) : showFailure ? (
          <p className="mt-3 text-sm text-brand-amber">
            No pudimos enviar el correo en el primer intento. Usa Reenviar o revisa tu bandeja y spam.
          </p>
        ) : (
          <p className="mt-3 text-muted">
            Enviamos un enlace de confirmación a{' '}
            <strong className="text-foreground">{email || 'tu correo'}</strong>.
          </p>
        )}

        <p className="mt-2 text-sm text-muted">
          Al confirmar quedarás autenticado con el correo y la contraseña que registraste.
          Luego verás el estado de tu solicitud de acceso.
        </p>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {resent && emailSent && (
          <p className="mt-4 text-sm text-green-700 dark:text-green-400">Correo enviado. Revisa bandeja y spam.</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Button
            onClick={resend}
            variant="secondary"
            disabled={resendDisabled || autoRetrying || cooldownLeft > 0}
          >
            {cooldownLeft > 0 ? `Reenviar en ${cooldownSecs}s` : 'Reenviar correo'}
          </Button>
          <Button href="/login" variant="ghost">Ir a iniciar sesión</Button>
          <Link href="/" className="text-sm text-muted hover:text-brand-amber">Volver al inicio</Link>
        </div>
    </ClayFormCard>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <CheckEmailContent />
    </Suspense>
  );
}
