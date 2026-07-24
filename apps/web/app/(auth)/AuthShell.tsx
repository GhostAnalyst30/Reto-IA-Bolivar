'use client';

import { usePathname } from 'next/navigation';
import { PublicSiteShell } from '@/components/immersive/layout/PublicSiteShell';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Login uses the FRONT ZIP full-bleed glass layout (no public chrome).
  if (pathname === '/login') {
    return <>{children}</>;
  }
  return (
    <PublicSiteShell variant="auth" authCentered>
      {children}
    </PublicSiteShell>
  );
}
