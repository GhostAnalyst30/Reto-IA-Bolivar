'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getProfilePath, ROLE_LABELS } from '@/lib/utils';
import { LogOut, Menu, X, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { ActiveNavIndicator } from '@/components/portal/ActiveNavIndicator';
import { PageTransition } from '@/components/portal/PageTransition';
import { NavMenu, filterNavEntries } from '@/components/layout/NavMenu';
import type { NavEntry, NavItem } from '@/lib/nav-types';
import { useAuthTransition } from '@/contexts/AuthTransitionContext';

type PortalType = 'student' | 'institutional';

interface PortalShellProps {
  nav: NavEntry[];
  learningNav?: NavItem[];
  children: React.ReactNode;
  isAdmin?: boolean;
  isCounselor?: boolean;
  role?: string;
  portal?: PortalType;
}

export function PortalShell({
  nav,
  learningNav,
  children,
  isAdmin,
  isCounselor,
  role = 'student',
  portal = 'student',
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(true);
  const supabase = createClient();
  const profilePath = getProfilePath(role);
  const { finishTransition } = useAuthTransition();

  useEffect(() => {
    finishTransition();
  }, [finishTransition]);

  const filteredNav = filterNavEntries(nav, !!isAdmin, !!isCounselor);
  const filteredLearning = (learningNav || []).filter((n) => !n.adminOnly || isAdmin);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  function learningLink(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'relative block rounded-[var(--portal-radius,0.25rem)] px-3 py-2 text-[13px] transition-colors',
          active
            ? 'bg-[color-mix(in_srgb,var(--portal-accent)_12%,transparent)] font-medium text-[var(--portal-accent)]'
            : 'text-muted hover:bg-brand-bg hover:text-foreground dark:hover:text-white'
        )}
      >
        <ActiveNavIndicator active={active} />
        <span className="relative">{item.label}</span>
      </Link>
    );
  }

  const portalLabel = portal === 'student' ? 'Estudiante' : (ROLE_LABELS[role] || 'Directivo');

  return (
    <div className="flex min-h-screen" data-portal={portal}>
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
            {portalLabel}
          </span>
        </div>
        <nav className="px-4 pb-20 space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <NavMenu entries={filteredNav} pathname={pathname} onNavigate={() => setOpen(false)} />
          {filteredLearning.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLearningOpen(!learningOpen)}
                className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted hover:text-[var(--portal-accent)]"
              >
                Aprendizaje
                <span className={cn('transition-transform', learningOpen ? 'rotate-180' : '')}>▾</span>
              </button>
              {learningOpen && (
                <div className="ml-2 mt-1 space-y-1 border-l border-brand-border pl-2">
                  {filteredLearning.map(learningLink)}
                </div>
              )}
            </div>
          )}
          <Link
            href={profilePath}
            onClick={() => setOpen(false)}
            className={cn(
              'relative flex items-center gap-2 rounded-[var(--portal-radius,0.25rem)] px-3 py-2 text-sm transition-colors mt-2',
              pathname === profilePath
                ? 'bg-[color-mix(in_srgb,var(--portal-accent)_12%,transparent)] font-medium text-[var(--portal-accent)]'
                : 'text-muted hover:bg-brand-bg'
            )}
          >
            <ActiveNavIndicator active={pathname === profilePath} />
            <User className="relative h-4 w-4" /> <span className="relative">Mi perfil</span>
          </Link>
        </nav>
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={logout}
          className="absolute bottom-4 left-4 flex items-center gap-2 rounded-[var(--portal-radius,0.25rem)] px-2 py-1 text-sm text-muted hover:bg-brand-bg hover:text-[var(--portal-accent)] dark:hover:text-white"
        >
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

export const STUDENT_NAV: NavItem[] = [
  { href: '/student/twin/summary', label: 'Mi Digital Twin' },
  { href: '/student/onboarding/survey', label: 'Encuesta de caracterización' },
  { href: '/student/opportunities', label: 'Oportunidades' },
  { href: '/student/resources', label: 'Recursos y apoyo' },
  { href: '/student/twin/chat', label: 'Chat Digital Twin' },
];

/** @deprecated Learning paths removed from desertion-focused nav */
export const STUDENT_NAV_LEARNING: NavItem[] = [];

/** @deprecated use getInstitutionalNav from utils */
export const INSTITUTIONAL_NAV: NavItem[] = [];
