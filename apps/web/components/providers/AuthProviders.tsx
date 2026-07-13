'use client';

import type { ReactNode } from 'react';
import { AuthTransitionProvider } from '@/contexts/AuthTransitionContext';
import { AuthProcessOverlay } from '@/components/auth/AuthProcessOverlay';

export function AuthProviders({ children }: { children: ReactNode }) {
  return (
    <AuthTransitionProvider>
      {children}
      <AuthProcessOverlay />
    </AuthTransitionProvider>
  );
}
