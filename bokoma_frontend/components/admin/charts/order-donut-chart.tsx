'use client';
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface OrderDonutChartProps {
  data: Array<{ status: string; count: number }>;
  title: string;
  description?: string;
}

const COLORS: Record<string, string> = {
  pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', 
  delivered: '#22c55e', cancelled: '#ef4444', default: '#94a3b8'
};
const LABELS: Record<string, string> = {
  pending: 'En attente', processing: 'En préparation', shipped: 'Expédiée', 
  delivered: 'Livrée', cancelled: 'Annulée'
};

export function OrderDonutChart({ data, title, description }: OrderDonutChartProps) {
  const total = useMemo(() => data.reduce((a, b) => a + b.count, 0), [data]);
  const chartData = useMemo(() => data.map(d => ({
    name: LABELS[d.status] || d.status,
    value: d.count,
    fill: COLORS[d.status] || COLORS.default
  })), [data]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 h-full">
      <div className="mb-4 text-center">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {chartData.map((_, i) => <Cell key={i} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
            <Legend verticalAlign="bottom" height={36} />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
              <tspan className="text-2xl font-bold">{total}</tspan>
              <tspan x="50%" dy="20" className="text-xs fill-muted-foreground">Total</tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}