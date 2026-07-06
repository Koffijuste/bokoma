// components/admin/charts/StatusPieChart.tsx
'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

function StatusPieChartImpl({ data }: { data: ChartData[] }) {
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
          isAnimationActive={false}
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

// ✅ Mémoïsation : évite rerender si `data` est identique (référence stable).
export default React.memo(StatusPieChartImpl);
