import { Suspense } from 'react';
import LoginClient from '@/app/(auth)/login/LoginClient';
import { AuthLoadingFallback } from '@/components/immersive/layout/AuthLoadingFallback';

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <LoginClient />
    </Suspense>
  );
}
