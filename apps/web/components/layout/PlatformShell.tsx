'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getProfilePath } from '@/lib/utils';
import { LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface NavItem { href: string; label: string }

interface PlatformShellProps {
  title: string;
  subtitle?: string;
  role: string;
  nav: NavItem[];
  children: React.ReactNode;
}

export function PlatformShell({ title, subtitle, nav, role, children }: PlatformShellProps) {
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
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-brand-amber/10 text-brand-amber'
                  : 'text-zinc-500 hover:bg-brand-bg hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={profilePath}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === profilePath ? 'bg-brand-amber/10 text-brand-amber' : 'text-zinc-500 hover:bg-brand-bg'
            )}
          >
            <User className="h-4 w-4" /> Mi perfil
          </Link>
        </nav>
        <button type="button" onClick={logout} className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-zinc-500 hover:text-foreground">
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

export const PLATFORM_NAV: NavItem[] = [
  { href: '/platform/dashboard', label: 'Dashboard' },
  { href: '/platform/institutions', label: 'Instituciones' },
  { href: '/platform/users', label: 'Usuarios' },
];
