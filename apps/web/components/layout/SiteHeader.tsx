'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UtbLogo } from '@/components/branding/UtbLogo';

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-brand-blue/20 bg-brand-blue/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" aria-label="Inicio UTB Te acompaña">
          <UtbLogo variant="light" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#modulos" className="text-sm text-brand-blue-light hover:text-white">Módulos</Link>
          <Link href="/#experiencias" className="text-sm text-brand-blue-light hover:text-white">Experiencias</Link>
          <Link href="/quienes-somos" className="text-sm text-brand-blue-light hover:text-white">Quiénes somos</Link>
          <Link href="/terminos#seguridad" className="text-sm text-brand-blue-light hover:text-white">Seguridad</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
          <Button href="/login" variant="ghost" size="sm" className="text-white hover:bg-white/10">
            Iniciar sesión
          </Button>
          <Button href="/register/student" size="sm">Registrarse</Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-brand-surface py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <UtbLogo showTagline={false} variant="compact" />
            <div>
              <p className="font-display text-lg font-semibold text-brand-blue">UTB Te acompaña</p>
              <p className="mt-1 text-sm text-muted">Universidad Tecnológica de Bolívar · 2026</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted">
            <Link href="/quienes-somos" className="hover:text-brand-blue-mid">Quiénes somos</Link>
            <Link href="/terminos" className="hover:text-brand-blue-mid">Términos</Link>
            <Link href="/register/student" className="hover:text-brand-blue-mid">Estudiantes</Link>
            <Link href="/register/institutional" className="hover:text-brand-blue-mid">Institucional</Link>
            <Link href="/login" className="hover:text-brand-blue-mid">Acceso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
