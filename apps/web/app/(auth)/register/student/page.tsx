'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { BentoCell } from '@/components/ui/BentoGrid';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { isUtbEmail, normalizeUsername } from '@/lib/utb-auth';

export default function RegisterStudentPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const router = useRouter();

  const checkUsername = useCallback(async (value: string) => {
    const normalized = normalizeUsername(value);
    if (normalized.length < 3) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }
    setUsernameStatus('checking');
    const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalized)}`);
    const data = await res.json();
    if (!res.ok) {
      setUsernameStatus('invalid');
      setSuggestions([]);
      return;
    }
    if (data.available) {
      setUsernameStatus('available');
      setSuggestions([]);
    } else {
      setUsernameStatus('taken');
      setSuggestions(data.suggestions || []);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.trim()) checkUsername(username);
    }, 400);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isUtbEmail(email)) {
      setError('Debes registrarte con un correo @utb.edu.co');
      setLoading(false);
      return;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setError('El nombre de usuario no está disponible');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: normalizeUsername(username),
          password,
          full_name: fullName,
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
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-12">
      <BentoCell animate={false} className="w-full max-w-md">
        <Link href="/" aria-label="Inicio"><UtbLogo /></Link>
        <h1 className="mt-6 font-display text-xl font-semibold text-brand-blue">Registro estudiante</h1>
        <p className="mt-2 text-sm text-muted">
          Microservicio UTB Te acompaña. Solo correos institucionales @utb.edu.co.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><Label htmlFor="name">Nombre completo</Label><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div>
            <Label htmlFor="username">Usuario</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="ej. maria_gomez" required />
            <p className="mt-1 text-xs text-muted">Independiente de la parte local de tu correo.</p>
            {usernameStatus === 'checking' && <p className="mt-1 text-xs text-muted">Verificando...</p>}
            {usernameStatus === 'available' && <p className="mt-1 text-xs text-green-700">Usuario disponible</p>}
            {usernameStatus === 'taken' && (
              <div className="mt-1 text-xs text-red-600">
                <p>Ese usuario ya está en uso.</p>
                {suggestions.length > 0 && (
                  <p className="mt-1">
                    Sugerencias:{' '}
                    {suggestions.map((s) => (
                      <button key={s} type="button" className="mr-2 text-brand-blue-mid underline" onClick={() => setUsername(s)}>
                        {s}
                      </button>
                    ))}
                  </p>
                )}
              </div>
            )}
            {usernameStatus === 'invalid' && <p className="mt-1 text-xs text-red-600">Formato inválido (3-30 caracteres, letra inicial)</p>}
          </div>
          <div>
            <Label htmlFor="email">Correo institucional</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@utb.edu.co" required />
          </div>
          <div><Label htmlFor="password">Contraseña</Label><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || usernameStatus === 'taken'}>{loading ? 'Registrando...' : 'Enviar solicitud'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted"><Link href="/login" className="text-brand-amber hover:underline">¿Ya tienes cuenta?</Link></p>
      </BentoCell>
    </div>
  );
}
