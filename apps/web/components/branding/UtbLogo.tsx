import { cn } from '@/lib/utils';

interface UtbLogoProps {
  className?: string;
  /** default: sidebar/marketing; light: sobre fondo azul; compact: solo isotipo + siglas */
  variant?: 'default' | 'light' | 'compact';
  showTagline?: boolean;
}

/** Placeholder institucional UTB hasta disponer del logo oficial. */
export function UtbLogo({ className, variant = 'default', showTagline = true }: UtbLogoProps) {
  const isLight = variant === 'light';
  const titleClass = isLight
    ? 'text-white'
    : 'text-brand-blue dark:text-white';
  const taglineClass = isLight ? 'text-brand-amber' : 'text-brand-amber';

  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="Universidad Tecnológica de Bolívar">
      <svg
        viewBox="0 0 40 40"
        className={cn('shrink-0', variant === 'compact' ? 'h-8 w-8' : 'h-9 w-9')}
        aria-hidden
        role="img"
      >
        <rect width="40" height="40" rx="2" fill="#003A70" />
        <path
          d="M8 28V14h4.2l3.8 9.2L19.8 14H24v14h-3.2v-8.4L17.2 28h-2.4l-3.6-8.4V28H8z"
          fill="#FFFFFF"
        />
        <path d="M26 14h6v2.6h-2.6V28H26V14z" fill="#F28C28" />
      </svg>
      {!showTagline && variant === 'compact' ? (
        <span className={cn('font-display text-lg font-semibold tracking-tight', titleClass)}>UTB</span>
      ) : showTagline ? (
        <div className="leading-tight">
          <span className={cn('font-display font-semibold tracking-tight', titleClass)}>UTB</span>
          <span className={taglineClass}> Te acompaña</span>
        </div>
      ) : null}
    </div>
  );
}
