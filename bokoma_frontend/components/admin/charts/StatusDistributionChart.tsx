// components/admin/charts/StatusDistributionChart.tsx
'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ShoppingCart, Loader2 } from 'lucide-react';

interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

export default function StatusDistributionChart({ data, loading }: { data: StatusDistribution[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Aucune commande pour afficher la répartition</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="status"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color} 
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: number, name: string) => [
            `${value} commande${value > 1 ? 's' : ''}`,
            STATUS_LABELS[name] || name
          ]}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">
              {STATUS_LABELS[value] || value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}