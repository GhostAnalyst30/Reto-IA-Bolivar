import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', href, children, ...props }, ref) => {
    const styles = cn(
      'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 active:scale-[0.98]',
      {
        'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-container': variant === 'primary',
        'border border-outline-variant/50 bg-surface-container-lowest text-primary hover:bg-surface-container-low': variant === 'secondary',
        'hover:bg-surface-container-low': variant === 'ghost',
        'bg-red-900/40 text-red-200 hover:bg-red-900/60': variant === 'danger',
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-5 py-2.5 text-sm': size === 'md',
        'px-7 py-3 text-base': size === 'lg',
      },
      className
    );

    if (href) {
      return (
        <Link href={href} className={styles}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={styles} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('glass-card rounded-2xl p-6 shadow-sm transition-transform hover:scale-[1.005]', className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 ml-1 block text-sm font-semibold text-on-surface-variant', className)}>
      {children}
    </label>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm text-on-surface transition-colors focus:border-primary focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-container-high', className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin text-primary', className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Cargando"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

/** Skeleton de tarjetas para estados de carga de listados/grids. */
export function LoadingState({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-4 h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'glass-card flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/40 px-6 py-14 text-center',
        className
      )}
    >
      {icon && <div className="mb-3 text-primary">{icon}</div>}
      <p className="font-medium text-on-surface">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'amber' | 'green' | 'red'; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', {
      'bg-surface-container-high text-on-surface-variant': variant === 'default',
      'bg-amber-500/15 text-amber-700 dark:text-amber-300': variant === 'amber',
      'bg-green-500/15 text-green-800 dark:text-green-300': variant === 'green',
      'bg-red-500/15 text-red-700 dark:text-red-300': variant === 'red',
    }, className)}>
      {children}
    </span>
  );
}
