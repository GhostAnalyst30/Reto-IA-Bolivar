'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { ClayFormCard } from '@/components/immersive/clay/ClayFormCard';
import { AuthLoadingFallback } from '@/components/immersive/layout/AuthLoadingFallback';
import { UtbLogo } from '@/components/branding/UtbLogo';

function safeNext(raw: string | null): string {
  const fallback = '/pending-approval';
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw.includes('://') || raw.includes('\\')) return fallback;
  return raw;
}

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') || 'magiclink') as 'magiclink' | 'recovery' | 'email';
  const next = safeNext(searchParams.get('next'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (!tokenHash) {
      setError('Enlace inválido o incompleto. Solicita un nuevo correo.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      setError(
        verifyError.message.includes('expired') || verifyError.message.includes('invalid')
          ? 'El enlace expiró o ya fue usado. Solicita un nuevo correo de confirmación.'
          : verifyError.message
      );
      setLoading(false);
      return;
    }

    router.replace(next);
  }

  return (
    <ClayFormCard className="space-y-4 text-center">
      <Link href="/" className="mx-auto inline-block" aria-label="Inicio">
        <UtbLogo />
      </Link>
      <h1 className="font-display text-2xl text-brand-blue">Confirmar cuenta</h1>
      <p className="text-sm text-muted">
        Haz clic en el botón para activar tu cuenta. Este paso evita que filtros de correo
        consuman el enlace automáticamente.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button onClick={confirm} disabled={loading || !tokenHash} className="w-full">
        {loading ? 'Confirmando…' : 'Confirmar y continuar'}
      </Button>
    </ClayFormCard>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <ConfirmForm />
    </Suspense>
  );
}
