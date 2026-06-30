'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-brand-border/50 bg-brand-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Bolívar<span className="text-brand-amber">IA</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#modulos" className="text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-white">Módulos</a>
          <a href="#experiencias" className="text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-white">Experiencias</a>
          <Link href="/quienes-somos" className="text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-white">Quiénes somos</Link>
          <Link href="/terminos#seguridad" className="text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-white">Seguridad</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button href="/login" variant="ghost" size="sm">Iniciar sesión</Button>
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
          <div>
            <p className="font-display text-lg font-semibold">UTB — Bolívar IA</p>
            <p className="mt-1 text-sm text-zinc-500">Universidad Tecnológica de Bolívar · 2026</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
            <Link href="/quienes-somos" className="hover:text-foreground">Quiénes somos</Link>
            <Link href="/terminos" className="hover:text-foreground">Términos</Link>
            <Link href="/register/student" className="hover:text-foreground">Estudiantes</Link>
            <Link href="/register/institutional" className="hover:text-foreground">Institucional</Link>
            <Link href="/login" className="hover:text-foreground">Acceso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
