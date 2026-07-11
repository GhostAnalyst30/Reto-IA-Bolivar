'use client';

import Link from 'next/link';
import { ComponentProps } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export function PortalButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn('rounded-[var(--portal-radius,0.25rem)]', className)}
      {...props}
    />
  );
}
