'use client';

import { PublicSiteShell } from '@/components/immersive/layout/PublicSiteShell';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <PublicSiteShell variant="auth" authCentered>
      {children}
    </PublicSiteShell>
  );
}
