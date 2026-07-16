'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PieChartPanelProps {
  data: { label: string; value: number }[];
  colors?: string[];
  height?: number;
}

export default function PieChartPanel({
  data,
  colors = ['#F28C28', '#003A70', '#4A90C2', '#71717a'],
  height = 220,
}: PieChartPanelProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
