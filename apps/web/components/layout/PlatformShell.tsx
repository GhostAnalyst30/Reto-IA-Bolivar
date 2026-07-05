'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getProfilePath, isPlatformAdmin } from '@/lib/utils';
import { LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { InstitutionSelector } from '@/components/layout/InstitutionSelector';
import { UtbLogo } from '@/components/branding/UtbLogo';

interface NavItem { href: string; label: string }

interface PlatformShellProps {
  title: string;
  subtitle?: string;
  role: string;
  nav: readonly NavItem[] | NavItem[];
  children: React.ReactNode;
}

export function PlatformShell({ title, subtitle, nav, role, children }: PlatformShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const profilePath = getProfilePath(role);
  const showInstitutionSelector = isPlatformAdmin(role);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="flex min-h-screen">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-brand-border bg-brand-surface transition-transform lg:translate-x-0 overflow-y-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-brand-blue/20 bg-brand-blue px-4">
          <Link href="/" aria-label="Inicio UTB Te acompaña">
            <UtbLogo variant="light" />
          </Link>
          <button type="button" aria-label="Cerrar menú" className="lg:hidden text-white" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-4 space-y-1 pb-20">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-sm px-3 py-2 text-sm transition-colors',
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-brand-blue/10 text-brand-blue font-medium'
                  : 'text-muted hover:bg-brand-bg hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={profilePath}
            className={cn(
              'flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors',
              pathname === profilePath ? 'bg-brand-blue/10 text-brand-blue font-medium' : 'text-muted hover:bg-brand-bg'
            )}
          >
            <User className="h-4 w-4" /> Mi perfil
          </Link>
        </nav>
        <button type="button" onClick={logout} className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-muted hover:text-brand-blue">
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="flex h-16 items-center gap-4 border-b border-brand-blue/20 bg-brand-blue px-6 text-white">
          <button type="button" aria-label="Abrir menú" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-xs text-brand-blue-light">{subtitle}</p>}
          </div>
          {showInstitutionSelector && <InstitutionSelector />}
          <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
        </header>
        <main className="flex-1 bg-brand-bg p-6">{children}</main>
      </div>
    </div>
  );
}

export { PLATFORM_FULL_NAV } from '@/lib/utils';
