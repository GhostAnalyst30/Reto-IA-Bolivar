'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UtbLogo } from '@/components/branding/UtbLogo';
import { usePublicNav } from '@/components/immersive/context/PublicNavContext';
import { useMotionSafe } from '@/components/immersive/hooks/useMotionSafe';
import { cn } from '@/lib/utils';

export function FloatingNavBubble() {
  const { headerVisible } = usePublicNav();
  const { reduceMotion } = useMotionSafe();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isRegisterRoute = pathname.startsWith('/register');

  const navLinks = isHome
    ? [
        { href: '/#narrativa', label: 'Narrativa' },
        { href: '/#modulos', label: 'Módulos' },
        { href: '/#experiencias', label: 'Experiencias' },
        { href: '/quienes-somos', label: 'Nosotros' },
        { href: '/terminos#seguridad', label: 'Seguridad' },
      ]
    : [
        { href: '/', label: 'Inicio' },
        { href: '/quienes-somos', label: 'Nosotros' },
        { href: '/terminos#seguridad', label: 'Seguridad' },
      ];

  return (
    <AnimatePresence>
      {!headerVisible && (
        <motion.nav
          key="floating-nav-bubble"
          initial={reduceMotion ? false : { opacity: 0, y: -16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className={cn(
            'fixed top-10 left-1/4 right-1/4 z-[60] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1.5',
            'rounded-[var(--public-radius-pill)] border border-brand-border bg-brand-surface/95 px-2 py-1.5',
            'clay-surface shadow-lg backdrop-blur-xl sm:gap-2 sm:px-3 sm:py-2'
          )}
          aria-label="Navegación compacta"
        >
          <Link
            href="/"
            className="flex shrink-0 min-h-[44px] min-w-[44px] items-center justify-center"
            aria-label="Inicio UTB Te acompaña"
          >
            <UtbLogo variant="compact" showTagline={false} />
          </Link>

          <div className="flex items-center gap-0.5 overflow-x-auto sm:gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 min-h-[44px] whitespace-nowrap rounded-[var(--public-radius-sm)] px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-brand-bg hover:text-foreground sm:px-3"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 border-l border-brand-border pl-1.5 sm:gap-1 sm:pl-2">
            <ThemeToggle className="min-h-[44px] min-w-[44px] rounded-[var(--public-radius-sm)] hover:bg-brand-bg" />

            <Link
              href="/login"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--public-radius-sm)] text-brand-blue hover:bg-brand-bg"
              aria-label="Iniciar sesión"
            >
              <LogIn className="h-4 w-4" />
            </Link>

            {!isRegisterRoute && (
              <Link
                href="/register/student"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--public-radius-sm)] bg-brand-amber text-white hover:bg-[#d97a1f]"
                aria-label="Registrarse"
              >
                <UserPlus className="h-4 w-4" />
              </Link>
            )}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
