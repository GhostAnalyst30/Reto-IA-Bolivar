'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';

export { ChartSkeleton };

export const LazyBarChart = dynamic(() => import('./BarChartPanel'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const LazyPieChart = dynamic(() => import('./PieChartPanel'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
