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
      'inline-flex items-center justify-center rounded-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50',
      {
        'bg-brand-amber text-white hover:bg-[#d97a1f]': variant === 'primary',
        'border border-brand-blue-mid bg-brand-surface text-brand-blue-mid hover:bg-brand-blue/5 hover:border-brand-blue': variant === 'secondary',
        'hover:bg-brand-surface': variant === 'ghost',
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
    <div className={cn('rounded-sm border border-brand-border bg-brand-surface p-6 shadow-sm transition-transform hover:scale-[1.005]', className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-sm border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-brand-amber focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-medium text-foreground', className)}>
      {children}
    </label>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-sm border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-foreground focus:border-brand-amber focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'amber' | 'green' | 'red'; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', {
      'bg-zinc-800 text-zinc-300': variant === 'default',
      'bg-brand-amber/20 text-brand-amber': variant === 'amber',
      'bg-green-900/40 text-green-300': variant === 'green',
      'bg-red-900/40 text-red-300': variant === 'red',
    }, className)}>
      {children}
    </span>
  );
}
