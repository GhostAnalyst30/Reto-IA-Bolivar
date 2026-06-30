'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface NavItem { href: string; label: string; adminOnly?: boolean }

interface PortalShellProps {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function PortalShell({ title, subtitle, nav, children, isAdmin }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const filteredNav = nav.filter((n) => !n.adminOnly || isAdmin);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="flex min-h-screen">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-brand-border bg-brand-surface transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-brand-border px-4">
          <Link href="/" className="font-display font-semibold">Bolívar<span className="text-brand-amber">IA</span></Link>
          <button type="button" aria-label="Cerrar menú" className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-4 space-y-1">
          {filteredNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-brand-amber/10 text-brand-amber'
                  : 'text-zinc-500 hover:bg-brand-bg hover:text-foreground dark:text-zinc-400 dark:hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button type="button" aria-label="Cerrar sesión" onClick={logout} className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground">
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="flex h-16 items-center gap-4 border-b border-brand-border bg-brand-bg px-6">
          <button type="button" aria-label="Abrir menú" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export const STUDENT_NAV: NavItem[] = [
  { href: '/student/chat', label: 'Chat IA' },
  { href: '/student/vocational', label: 'Test vocacional' },
  { href: '/student/programs', label: 'Programas UTB' },
  { href: '/student/paths', label: 'Rutas de aprendizaje' },
  { href: '/student/learning/search', label: 'Buscador' },
  { href: '/student/learning/tutor', label: 'Tutor RAG' },
  { href: '/student/progress', label: 'Progreso' },
  { href: '/student/resources', label: 'Recursos guardados' },
  { href: '/student/onboarding', label: 'Vincular institución' },
];

export const INSTITUTIONAL_NAV: NavItem[] = [
  { href: '/institutional/analytics', label: 'Analítica' },
  { href: '/institutional/prediction', label: 'Predicción' },
  { href: '/institutional/documents', label: 'Documental' },
  { href: '/institutional/executive-summary', label: 'Resumen ejecutivo' },
  { href: '/institutional/actions', label: 'Acciones' },
  { href: '/institutional/director', label: 'Director de IA' },
  { href: '/institutional/admin/programs', label: 'Programas académicos', adminOnly: true },
  { href: '/institutional/admin', label: 'Administración', adminOnly: true },
  { href: '/institutional/admin/requests', label: 'Solicitudes', adminOnly: true },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol', adminOnly: true },
  { href: '/institutional/admin/security', label: 'Seguridad', adminOnly: true },
];
