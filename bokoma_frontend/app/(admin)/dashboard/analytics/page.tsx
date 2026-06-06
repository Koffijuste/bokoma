'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';

type StatusStat = {
  _id: string;
  count: number;
};

type AnalyticsData = {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    avgOrder: number;
  };
  byStatus: StatusStat[];
};

const initialAnalytics: AnalyticsData = {
  stats: {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrder: 0,
  },
  byStatus: [
    { _id: 'pending', count: 0 },
    { _id: 'shipped', count: 0 },
    { _id: 'delivered', count: 0 },
  ],
};

const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

export default function AnalyticsAdminPage() {
  useRequireAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const data = await orderApi.getOrderStats();
        setAnalytics({
          stats: {
            totalOrders: data.stats?.totalOrders ?? 0,
            totalRevenue: data.stats?.totalRevenue ?? 0,
            avgOrder: data.stats?.avgOrder ?? 0,
          },
          byStatus: data.byStatus?.map((item: StatusStat) => ({
            _id: item._id,
            count: item.count,
          })) ?? initialAnalytics.byStatus,
        });
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">Analytiques & Rapports</h1>
        <p className="text-muted-foreground">
          Analysez vos données commerciales
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        {loading ? (
          <div className="col-span-full rounded-lg bg-card border border-border p-8 text-center text-muted-foreground">
            Chargement des statistiques...
          </div>
        ) : error ? (
          <div className="col-span-full rounded-lg bg-card border border-border p-8 text-center text-destructive">
            {error}
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-card border border-border p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-3">Commandes totales</h2>
                <p className="text-3xl font-bold">{analytics.stats.totalOrders}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-3">Revenu total</h2>
                <p className="text-3xl font-bold">€{analytics.stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-3">Panier moyen</h2>
                <p className="text-3xl font-bold">€{analytics.stats.avgOrder.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded-lg bg-card border border-border p-6">
              <h2 className="text-lg font-semibold mb-3">Répartition des statuts</h2>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.byStatus}
                      dataKey="count"
                      nameKey="_id"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                    >
                      {analytics.byStatus.map((entry, index) => (
                        <Cell key={entry._id} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {analytics.byStatus.map((status, index) => (
                  <div key={status._id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium capitalize">{status._id}</span>
                    </div>
                    <p>{status.count} commandes</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
