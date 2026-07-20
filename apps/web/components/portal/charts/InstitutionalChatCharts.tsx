'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ChatChartData } from './LazyChatChart';

const COLORS = ['#003A70', '#F28C28', '#6366F1', '#4A90C2'];

export default function InstitutionalChatCharts({ chart }: { chart: ChatChartData }) {
  if (!chart?.data?.length) return null;
  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={chart.data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={60} label>
            {chart.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chart.data}>
        <XAxis dataKey="label" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" fill="#003A70" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
