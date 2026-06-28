// components/admin/Charts.tsx
'use client';

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, ShoppingCart, Loader2 } from 'lucide-react';
import { formatPrice } from '@/utils/helpers';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

export function RevenueChart({ data, loading }: { data: RevenueDataPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Aucune donnée de revenu disponible</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="#9CA3AF" 
          fontSize={11} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis 
          stroke="#9CA3AF" 
          fontSize={11} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value/1000}k`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          labelStyle={{ color: '#F3F4F6' }}
          formatter={(value: number) => [formatPrice(value), 'Revenu']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#3B82F6" 
          strokeWidth={2} 
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, fill: '#60A5FA' }}
          name="Revenu"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusDistributionChart({ data, loading }: { data: StatusDistribution[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
        <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Aucune commande pour afficher la répartition</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
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

// ✅ DEFAULT EXPORT qui expose les deux composants
const Charts = {
  RevenueChart,
  StatusDistributionChart
};

export default Charts;