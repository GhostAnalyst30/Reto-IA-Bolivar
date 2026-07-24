'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getProfilePath, ROLE_LABELS } from '@/lib/utils';
import {
  Bell,
  Brain,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  type LucideIcon,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandMark } from '@/components/front/brand-mark';
import { ShaderBackground } from '@/components/front/shader-background';
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

const STUDENT_SIDEBAR: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Digital Twin', href: '/student/twin/summary', icon: Brain },
  { label: 'Caracterización', href: '/student/onboarding/survey', icon: ClipboardList },
  { label: 'Oportunidades', href: '/student/opportunities', icon: Sparkles },
  { label: 'Acompañamiento', href: '/student/resources', icon: LifeBuoy },
  { label: 'Chat', href: '/student/twin/chat', icon: MessageSquare },
];

const STUDENT_MOBILE: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Inicio', href: '/student/twin/summary', icon: LayoutDashboard },
  { label: 'Chat', href: '/student/twin/chat', icon: MessageSquare },
  { label: 'Becas', href: '/student/opportunities', icon: Sparkles },
  { label: 'Apoyo', href: '/student/resources', icon: LifeBuoy },
];

function isActive(pathname: string, href: string) {
  const base = href.split('#')[0];
  return pathname === base || pathname.startsWith(base + '/');
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

  if (portal === 'student') {
    return (
      <div className="min-h-screen bg-background text-foreground" data-portal="student">
        <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
          <ShaderBackground className="absolute inset-0 h-full w-full" />
        </div>

        <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/20 bg-surface/80 px-5 shadow-sm backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-6">
            <BrandMark />
            <nav className="ml-4 hidden items-center gap-1 lg:flex">
              {STUDENT_SIDEBAR.slice(0, 3).map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    isActive(pathname, item.href)
                      ? 'text-primary'
                      : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-low px-4 py-1.5 md:flex">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar..."
                aria-label="Buscar en el portal"
                className="w-40 border-none bg-transparent text-sm placeholder:text-on-surface-variant/60 focus:outline-none"
              />
            </div>
            <ThemeToggle className="rounded-full p-2 text-on-surface-variant hover:bg-primary/10 hover:text-primary" />
            <button
              type="button"
              aria-label="Notificaciones"
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Bell className="h-5 w-5" />
            </button>
            <Link
              href={profilePath}
              aria-label="Perfil de estudiante"
              className="hidden h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20 transition-transform active:scale-95 sm:block"
            >
              <Image
                src="/front/student-mateo.png"
                alt="Foto de perfil"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </Link>
            <button
              type="button"
              aria-label="Cerrar sesión"
              onClick={logout}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-white/20 bg-surface/90 pb-8 pt-20 shadow-xl backdrop-blur-2xl md:flex">
          <div className="mb-8 px-6">
            <h2 className="text-2xl font-extrabold text-primary">Portal Estudiantil</h2>
            <p className="text-xs font-medium text-on-surface-variant">Compañero académico</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {STUDENT_SIDEBAR.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'mx-2 flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-semibold transition-all',
                    active
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'text-on-surface-variant hover:translate-x-1 hover:bg-secondary-container/60',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href={profilePath}
              className={cn(
                'mx-2 flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-semibold transition-all',
                isActive(pathname, profilePath)
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:translate-x-1 hover:bg-secondary-container/60',
              )}
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span>Mi perfil</span>
            </Link>
          </nav>
          <div className="mt-auto px-4">
            <Link
              href="/student/twin/summary"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary-container py-3 font-bold text-primary transition-transform active:scale-95"
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </aside>

        <div className="relative z-10 pb-20 md:pb-0 md:pl-64">
          <PageTransition>{children}</PageTransition>
        </div>

        <nav className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant/10 bg-surface/90 backdrop-blur-xl md:hidden">
          {STUDENT_MOBILE.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1',
                  active ? 'text-primary' : 'text-on-surface-variant',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  /* Institutional / platform shell — same visual language, denser nav */
  function learningLink(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'relative block rounded-lg px-3 py-2 text-[13px] transition-colors',
          active
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
        )}
      >
        <span className="relative">{item.label}</span>
      </Link>
    );
  }

  const portalLabel = ROLE_LABELS[role] || 'Directivo';

  return (
    <div className="relative flex min-h-screen bg-background" data-portal={portal}>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20">
        <ShaderBackground className="absolute inset-0 h-full w-full" />
      </div>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/20 bg-surface/90 shadow-xl backdrop-blur-2xl transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-outline-variant/20 px-4">
          <BrandMark />
          <ThemeToggle className="lg:hidden" />
        </div>
        <div className="px-4 py-3">
          <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-primary">
            {portalLabel}
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-20">
          <NavMenu entries={filteredNav} pathname={pathname} onNavigate={() => setOpen(false)} />
          {filteredLearning.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLearningOpen(!learningOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant hover:text-primary"
              >
                Aprendizaje
                <span className={cn('transition-transform', learningOpen ? 'rotate-180' : '')}>▾</span>
              </button>
              {learningOpen && (
                <div className="ml-2 mt-1 space-y-1 border-l border-outline-variant/30 pl-2">
                  {filteredLearning.map(learningLink)}
                </div>
              )}
            </div>
          )}
          <Link
            href={profilePath}
            onClick={() => setOpen(false)}
            className={cn(
              'relative mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === profilePath
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            <User className="relative h-4 w-4" /> <span className="relative">Mi perfil</span>
          </Link>
        </nav>
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={logout}
          className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="relative z-10 flex flex-1 flex-col lg:ml-64">
        <button
          type="button"
          aria-label="Abrir menú"
          className="fixed left-4 top-4 z-20 rounded-xl bg-primary p-2 text-on-primary lg:hidden"
          onClick={() => setOpen(true)}
        >
          <LayoutDashboard className="h-5 w-5" />
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
