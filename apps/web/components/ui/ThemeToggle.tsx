'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        className="rounded-lg p-2 text-zinc-400 hover:bg-brand-surface hover:text-foreground"
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn('rounded-lg p-2 text-zinc-400 hover:bg-brand-surface hover:text-foreground transition-colors', className)}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
