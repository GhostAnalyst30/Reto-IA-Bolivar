'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/portal/charts/ChartSkeleton';

export type ChatChartData = {
  type: string;
  title: string;
  data: { label: string; value: number }[];
};

const ChatChartInner = dynamic(() => import('./InstitutionalChatCharts'), {
  ssr: false,
  loading: () => <ChartSkeleton height={180} />,
});

export function LazyChatChart({ chart }: { chart: ChatChartData }) {
  return <ChatChartInner chart={chart} />;
}
