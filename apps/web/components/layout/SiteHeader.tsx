'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-brand-border/50 bg-brand-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Bolívar<span className="text-brand-amber">IA</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#modulos" className="text-sm text-zinc-400 hover:text-white">Módulos</a>
          <a href="#experiencias" className="text-sm text-zinc-400 hover:text-white">Experiencias</a>
          <a href="#seguridad" className="text-sm text-zinc-400 hover:text-white">Seguridad</a>
        </nav>
        <div className="flex items-center gap-3">
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
            <p className="font-display text-lg font-semibold">Reto IA Bolívar</p>
            <p className="mt-1 text-sm text-zinc-500">Plataforma inteligente institucional · 2026</p>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/register/student" className="hover:text-white">Estudiantes</Link>
            <Link href="/register/institutional" className="hover:text-white">Institucional</Link>
            <Link href="/login" className="hover:text-white">Acceso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
