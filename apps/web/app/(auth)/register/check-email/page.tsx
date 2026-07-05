'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Button, Card } from '@/components/ui';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { Mail } from 'lucide-react';

function CheckEmailContent() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  async function resend() {
    setError('');
    const stored = sessionStorage.getItem('pending_confirmation');
    if (!stored) {
      setError('Vuelve a registrarte para reenviar el correo.');
      return;
    }
    try {
      const payload = JSON.parse(stored);
      const res = await fetch('/api/auth/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email || email,
          full_name: payload.full_name,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'No se pudo reenviar');
        return;
      }
      setResent(true);
    } catch {
      setError('Error de conexión');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <Link href="/" className="mx-auto mb-6 inline-block" aria-label="Inicio">
          <UtbLogo />
        </Link>
        <Mail className="mx-auto h-12 w-12 text-brand-amber" />
        <h1 className="mt-4 text-2xl font-semibold">Revisa tu correo</h1>
        <p className="mt-3 text-zinc-400">
          Enviamos un enlace de confirmación a{' '}
          <strong className="text-white">{email || 'tu correo'}</strong>.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Al hacer clic quedarás autenticado con el correo y la contraseña que registraste.
          Luego verás el estado de tu solicitud de acceso.
        </p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {resent && <p className="mt-4 text-sm text-green-400">Correo reenviado.</p>}
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={resend} variant="secondary">Reenviar correo</Button>
          <Button href="/login" variant="ghost">Ir a iniciar sesión</Button>
          <Link href="/" className="text-sm text-zinc-500 hover:text-brand-amber">Volver al inicio</Link>
        </div>
      </Card>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-zinc-500">Cargando...</div>}>
      <CheckEmailContent />
    </Suspense>
  );
}
