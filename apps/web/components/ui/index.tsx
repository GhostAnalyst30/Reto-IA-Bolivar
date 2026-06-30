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
      'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-amber disabled:opacity-50',
      {
        'bg-brand-amber text-brand-bg hover:bg-[#E8D48B]': variant === 'primary',
        'border border-brand-border bg-brand-surface hover:border-brand-amber/50': variant === 'secondary',
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
    <div className={cn('rounded-xl border border-brand-border bg-brand-surface p-6', className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-500 focus:border-brand-amber focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-300">
      {children}
    </label>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-foreground focus:border-brand-amber focus:outline-none',
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
