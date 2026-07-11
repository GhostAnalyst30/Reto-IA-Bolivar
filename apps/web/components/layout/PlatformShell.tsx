'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getProfilePath } from '@/lib/utils';
import { LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { ActiveNavIndicator } from '@/components/portal/ActiveNavIndicator';
import { PageTransition } from '@/components/portal/PageTransition';
import { NavMenu } from '@/components/layout/NavMenu';
import type { NavEntry } from '@/lib/nav-types';

interface PlatformShellProps {
  role: string;
  nav: NavEntry[];
  children: React.ReactNode;
}

export function PlatformShell({ nav, role, children }: PlatformShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const profilePath = getProfilePath(role);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="flex min-h-screen" data-portal="platform">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-brand-border bg-brand-surface transition-transform lg:translate-x-0 overflow-y-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div
          className="flex h-16 items-center justify-between border-b bg-brand-blue px-4"
          style={{ borderColor: 'color-mix(in srgb, var(--portal-accent) 35%, transparent)' }}
        >
          <Link href="/" aria-label="Inicio UTB Te acompaña">
            <UtbLogo variant="light" />
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
            <button type="button" aria-label="Cerrar menú" className="text-white" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden lg:block">
            <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
          </div>
        </div>
        <div className="px-3 py-2">
          <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
            style={{ background: 'var(--portal-accent)' }}>
            Platform Admin
          </span>
        </div>
        <nav className="px-4 pb-20 space-y-1">
          <NavMenu entries={nav} pathname={pathname} onNavigate={() => setOpen(false)} />
          <Link
            href={profilePath}
            className={cn(
              'relative flex items-center gap-2 rounded-[var(--portal-radius,0.25rem)] px-3 py-2 text-sm transition-colors mt-2',
              pathname === profilePath
                ? 'bg-[color-mix(in_srgb,var(--portal-accent)_12%,transparent)] font-medium text-[var(--portal-accent)]'
                : 'text-muted hover:bg-brand-bg dark:hover:text-white'
            )}
          >
            <ActiveNavIndicator active={pathname === profilePath} />
            <User className="relative h-4 w-4" /> <span className="relative">Mi perfil</span>
          </Link>
        </nav>
        <button type="button" onClick={logout} className="absolute bottom-4 left-4 flex items-center gap-2 rounded-[var(--portal-radius,0.25rem)] px-2 py-1 text-sm text-muted hover:bg-brand-bg hover:text-[var(--portal-accent)] dark:hover:text-white">
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex flex-1 flex-col bg-brand-bg lg:ml-64 portal-main-bg">
        <button
          type="button"
          aria-label="Abrir menú"
          className="fixed left-4 top-4 z-20 rounded-sm p-2 text-white lg:hidden"
          style={{ background: 'var(--portal-accent)' }}
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}

export { PLATFORM_FULL_NAV } from '@/lib/utils';
