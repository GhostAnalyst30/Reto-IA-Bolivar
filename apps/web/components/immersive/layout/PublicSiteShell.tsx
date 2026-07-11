'use client';

import { SiteHeader, SiteFooter } from '@/components/layout/SiteHeader';
import { FloatingNavBubble } from './FloatingNavBubble';
import { PublicNavProvider } from '../context/PublicNavContext';
import { AmbientBackground } from '../primitives/AmbientBackground';
import { StoryProgressBar } from '../primitives/StoryProgressBar';

type Variant = 'narrative' | 'content' | 'auth';

const INTENSITY: Record<Variant, 'full' | 'subtle' | 'minimal'> = {
  narrative: 'subtle',
  content: 'subtle',
  auth: 'minimal',
};

interface PublicSiteShellProps {
  children: React.ReactNode;
  variant?: Variant;
  showProgressBar?: boolean;
  authCentered?: boolean;
}

export function PublicSiteShell({
  children,
  variant = 'content',
  showProgressBar = false,
  authCentered = false,
}: PublicSiteShellProps) {
  const isAuth = variant === 'auth';

  return (
    <PublicNavProvider>
      <div className="relative min-h-screen bg-brand-bg">
        <AmbientBackground intensity={INTENSITY[variant]} />
        <SiteHeader minimal={isAuth} />
        {showProgressBar && <StoryProgressBar />}
        <main
          className={
            authCentered
              ? 'relative z-10 flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-x-hidden px-4 py-24'
              : 'relative z-10 overflow-x-hidden'
          }
        >
          {children}
        </main>
        <SiteFooter compact={isAuth} />
        {!isAuth && <FloatingNavBubble />}
      </div>
    </PublicNavProvider>
  );
}
