import Image from 'next/image';
import { cn } from '@/lib/utils';

export const BRAND_ICON = '/icons/images.png';
export const BRAND_ICON_SVG = '/icons/images.svg';
export const BRAND_FAVICON = '/icons/images.ico';

interface UtbLogoProps {
  className?: string;
  /** default: sidebar/marketing; light: sobre fondo azul; compact: isotipo + siglas */
  variant?: 'default' | 'light' | 'compact';
  showTagline?: boolean;
}

export function UtbLogo({ className, variant = 'default', showTagline = true }: UtbLogoProps) {
  const isLight = variant === 'light';
  const titleClass = isLight ? 'text-white' : 'text-brand-blue dark:text-white';
  const taglineClass = 'text-brand-amber';
  const iconSize = variant === 'compact' ? 32 : 36;

  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="Universidad Tecnológica de Bolívar">
      <Image
        src={BRAND_ICON}
        alt=""
        width={iconSize}
        height={iconSize}
        className={cn(
          'shrink-0 rounded-sm object-contain',
          variant === 'compact' ? 'h-8 w-8' : 'h-9 w-9',
        )}
        priority
      />
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
