'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui';

export const LazyMarkdownMessage = dynamic(
  () => import('@/components/ui/MarkdownMessage').then((m) => m.MarkdownMessage),
  {
    ssr: false,
    loading: () => <Skeleton className="h-4 w-48" />,
  },
);
