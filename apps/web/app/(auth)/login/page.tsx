import { Suspense } from 'react';
import LoginClient from '@/app/(auth)/login/LoginClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-zinc-500">Cargando...</div>}>
      <LoginClient />
    </Suspense>
  );
}
