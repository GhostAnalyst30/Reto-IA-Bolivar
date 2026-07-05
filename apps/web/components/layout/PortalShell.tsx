'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getProfilePath } from '@/lib/utils';
import { ChevronDown, LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UtbLogo } from '@/components/branding/UtbLogo';

interface NavItem { href: string; label: string; adminOnly?: boolean }

interface PortalShellProps {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  learningNav?: NavItem[];
  children: React.ReactNode;
  isAdmin?: boolean;
  role?: string;
}

export function PortalShell({
  title,
  subtitle,
  nav,
  learningNav,
  children,
  isAdmin,
  role = 'student',
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const supabase = createClient();
  const profilePath = getProfilePath(role);

  const filteredNav = nav.filter((n) => !n.adminOnly || isAdmin);
  const filteredLearning = (learningNav || []).filter((n) => !n.adminOnly || isAdmin);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  function navLink(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'block rounded-sm px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-brand-blue/10 text-brand-blue font-medium dark:text-brand-blue-light'
            : 'text-muted hover:bg-brand-bg hover:text-foreground dark:hover:text-white'
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-brand-border bg-brand-surface transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-brand-blue/20 bg-brand-blue px-4">
          <Link href="/" aria-label="Inicio UTB Te acompaña">
            <UtbLogo variant="light" />
          </Link>
          <button type="button" aria-label="Cerrar menú" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        <nav className="p-4 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {filteredNav.map(navLink)}
          {filteredLearning.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLearningOpen(!learningOpen)}
                className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted hover:text-brand-blue"
              >
                Aprendizaje
                <ChevronDown className={cn('h-4 w-4 transition-transform', learningOpen && 'rotate-180')} />
              </button>
              {learningOpen && (
                <div className="ml-2 mt-1 space-y-1 border-l border-brand-border pl-2">
                  {filteredLearning.map(navLink)}
                </div>
              )}
            </div>
          )}
          <Link
            href={profilePath}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors',
              pathname === profilePath ? 'bg-brand-blue/10 text-brand-blue font-medium' : 'text-muted hover:bg-brand-bg'
            )}
          >
            <User className="h-4 w-4" /> Mi perfil
          </Link>
        </nav>
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={logout}
          className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-muted hover:text-brand-blue"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="flex h-16 items-center gap-4 border-b border-brand-blue/20 bg-brand-blue px-6 text-white">
          <button type="button" aria-label="Abrir menú" className="lg:hidden text-white" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-brand-blue-light">{subtitle}</p>}
          </div>
          <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
        </header>
        <main className="flex-1 p-6">{children}</main>
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

export const STUDENT_NAV_LEARNING: NavItem[] = [
  { href: '/student/paths', label: 'Rutas de aprendizaje' },
  { href: '/student/learning/search', label: 'Buscador académico' },
  { href: '/student/learning/tutor', label: 'Tutor RAG' },
  { href: '/student/progress', label: 'Progreso' },
  { href: '/student/programs', label: 'Programas UTB' },
];

export const INSTITUTIONAL_NAV: NavItem[] = [
  { href: '/institutional/dashboard', label: 'Dashboard' },
  { href: '/institutional/risk', label: 'Riesgo de deserción' },
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/director', label: 'Director de IA' },
  { href: '/institutional/admin/content', label: 'Oportunidades y recursos', adminOnly: true },
  { href: '/institutional/admin/programs', label: 'Programas académicos', adminOnly: true },
  { href: '/institutional/admin', label: 'Administración', adminOnly: true },
  { href: '/institutional/admin/requests', label: 'Solicitudes', adminOnly: true },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol', adminOnly: true },
  { href: '/institutional/admin/security', label: 'Seguridad', adminOnly: true },
];
