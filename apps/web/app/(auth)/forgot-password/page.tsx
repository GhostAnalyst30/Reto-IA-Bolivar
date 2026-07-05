'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Label } from '@/components/ui';
import { BentoCell } from '@/components/ui/BentoGrid';
import { UtbLogo } from '@/components/branding/UtbLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo enviar el correo. Intente más tarde.');
      } else {
        setMessage('Si el correo está registrado, recibirás un enlace de recuperación.');
      }
    } catch {
      setError('Error de conexión. Intente más tarde.');
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <BentoCell animate={false} className="relative w-full max-w-md">
        <Link href="/login" aria-label="Inicio"><UtbLogo /></Link>
        <h1 className="mt-6 font-display text-xl font-semibold text-brand-blue">Recuperar contraseña</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Correo institucional</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@utb.edu.co" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-brand-amber hover:underline">Volver al login</Link>
        </p>
      </BentoCell>
    </div>
  );
}
