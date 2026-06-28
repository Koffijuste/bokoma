// components/admin/charts/RevenueChart.tsx
'use client';

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { formatPrice } from '@/utils/helpers';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export default function RevenueChart({ data, loading }: { data: RevenueDataPoint[]; loading: boolean }) {
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
        <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Aucune donnée de revenu disponible</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
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