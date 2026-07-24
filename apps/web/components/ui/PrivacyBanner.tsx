'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBannerProps {
  message?: string;
  className?: string;
}

export function PrivacyBanner({
  message = 'Tu información es confidencial. Solo tú decides compartir datos del Digital Twin con el personal UTB.',
  className,
}: PrivacyBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-900 dark:text-indigo-200',
        className
      )}
      role="note"
      aria-label="Aviso de privacidad"
    >
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
