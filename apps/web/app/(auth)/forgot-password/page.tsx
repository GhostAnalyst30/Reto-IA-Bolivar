'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Input, Label } from '@/components/ui';
import { BentoCell } from '@/components/ui/BentoGrid';
import { getAppUrl } from '@/lib/app-config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (email.toLowerCase().endsWith('@utb.demo')) {
      setMessage('Las cuentas demo no reciben correos. Use las credenciales del README.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError('No se pudo enviar el correo. Verifique el email.');
    } else {
      setMessage('Si el correo existe, recibirá un enlace para restablecer su contraseña.');
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <BentoCell animate={false} className="relative w-full max-w-md">
        <Link href="/login" className="font-display text-2xl font-bold">
          Bolívar<span className="text-brand-amber">IA</span>
        </Link>
        <h1 className="mt-6 text-xl font-semibold">Recuperar contraseña</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="text-brand-amber hover:underline">Volver al login</Link>
        </p>
      </BentoCell>
    </div>
  );
}
