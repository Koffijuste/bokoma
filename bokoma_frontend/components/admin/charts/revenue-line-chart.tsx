'use client';
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface RevenueLineChartProps {
  data: Array<{ date: string; revenue: number; orders: number }>;
  title: string;
  description?: string;
}

export function RevenueLineChart({ data, title, description }: RevenueLineChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}K`} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Revenu" />
            <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Commandes" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}