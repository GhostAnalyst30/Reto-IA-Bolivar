'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ClayButton } from '@/components/immersive/clay/ClayButton';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { usePublicNav } from '@/components/immersive/context/PublicNavContext';
import { useMotionSafe } from '@/components/immersive/hooks/useMotionSafe';

interface SiteHeaderProps {
  minimal?: boolean;
}

export function SiteHeader({ minimal = false }: SiteHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { headerVisible, setHeaderVisible } = usePublicNav();
  const { reduceMotion } = useMotionSafe();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isRegisterRoute = pathname.startsWith('/register');

  useEffect(() => {
    if (minimal) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeaderVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [minimal, setHeaderVisible]);

  if (minimal) {
    return (
      <header className="fixed top-0 z-50 w-full border-b border-brand-border/60 bg-brand-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-end px-6">
          <ThemeToggle className="hover:bg-brand-bg" />
        </div>
      </header>
    );
  }

  return (
    <>
      <AnimatePresence>
        {headerVisible && (
          <motion.header
            key="site-header"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 z-50 w-full border-b border-brand-blue/20 bg-brand-blue/95 backdrop-blur-xl"
          >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              <Link href="/" aria-label="Inicio UTB Te acompaña">
                <UtbLogo variant="light" />
              </Link>
              <nav className="hidden items-center gap-6 md:flex">
                {isHome ? (
                  <>
                    <Link href="/#narrativa" className="text-sm text-brand-blue-light hover:text-white">
                      Narrativa
                    </Link>
                    <Link href="/#modulos" className="text-sm text-brand-blue-light hover:text-white">
                      Módulos
                    </Link>
                    <Link href="/#experiencias" className="text-sm text-brand-blue-light hover:text-white">
                      Experiencias
                    </Link>
                  </>
                ) : (
                  <Link href="/" className="text-sm text-brand-blue-light hover:text-white">
                    Inicio
                  </Link>
                )}
                <Link href="/quienes-somos" className="text-sm text-brand-blue-light hover:text-white">
                  Quiénes somos
                </Link>
                <Link href="/terminos#seguridad" className="text-sm text-brand-blue-light hover:text-white">
                  Seguridad
                </Link>
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
                <ClayButton
                  href="/login"
                  variant="light"
                  size="sm"
                  className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10"
                >
                  Iniciar sesión
                </ClayButton>
                {!isRegisterRoute && (
                  <ClayButton href="/register/student" size="sm">
                    Registrarse
                  </ClayButton>
                )}
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>
      <div ref={sentinelRef} id="header-sentinel" className="pointer-events-none h-px w-full" aria-hidden />
    </>
  );
}

interface SiteFooterProps {
  compact?: boolean;
}

export function SiteFooter({ compact = false }: SiteFooterProps) {
  if (compact) {
    return (
      <footer className="relative z-10 border-t border-brand-border bg-brand-surface py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <UtbLogo showTagline={false} variant="compact" />
          <p className="text-sm text-muted">Universidad Tecnológica de Bolívar · 2026</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 border-t border-brand-border bg-brand-surface py-12">
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
            <Link href="/quienes-somos" className="hover:text-brand-blue-mid">
              Quiénes somos
            </Link>
            <Link href="/terminos" className="hover:text-brand-blue-mid">
              Términos
            </Link>
            <Link href="/register/student" className="hover:text-brand-blue-mid">
              Estudiantes
            </Link>
            <Link href="/register/institutional" className="hover:text-brand-blue-mid">
              Institucional
            </Link>
            <Link href="/login" className="hover:text-brand-blue-mid">
              Acceso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
