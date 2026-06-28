// components/admin/charts/AnalyticsCharts.tsx
'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsPieChartProps {
  data: ChartData[];
  colors?: string[];
}

export function StatusPieChart({ data }: AnalyticsPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-muted-foreground">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value} commande${value > 1 ? 's' : ''}`, 'Nombre']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PaymentPieChart({ data, colors }: AnalyticsPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-muted-foreground">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }

  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
  const chartColors = colors || defaultColors;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={chartColors[index % chartColors.length]} 
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value} commande${value > 1 ? 's' : ''}`, 'Nombre']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}