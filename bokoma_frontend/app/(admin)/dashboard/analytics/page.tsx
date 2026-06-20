// app/(admin)/dashboard/analytics/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, Package, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/helpers';

type StatusStat = {
  _id: string;
  count: number;
};

type AnalyticsData = {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    avgOrder: number;
    byStatus?: StatusStat[];
    byPayment?: Array<{ method: string; count: number }>;
    revenueTrend?: Array<{ date: string; revenue: number; orders: number }>;
  };
  period?: {
    days: number;
    start: string;
    end: string;
  };
};

const initialAnalytics: AnalyticsData = {
  stats: {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrder: 0,
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  processing: '#8B5CF6',
  shipped: '#06B6D4',
  delivered: '#10B981',
  cancelled: '#EF4444',
  refunded: '#6366F1',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

const PAYMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export default function AnalyticsAdminPage() {
  useRequireAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 [Analytics] Fetching stats...');
      const response = await orderApi.getOrderStats({ days: 30 });
      
      console.group('📊 [Analytics] Parsing response');
      console.log('📥 Response complète:', response);
      console.log('🔍 response.data:', (response as any)?.data);
      console.log('🔍 response.data.data:', (response as any)?.data?.data);
      
      // ✅ CORRECTION CRITIQUE : Naviguer dans la structure imbriquée
      const responseData = (response as any)?.data || response;
      const analyticsData = responseData?.data || responseData;
      const stats = analyticsData?.stats || {};
      const period = analyticsData?.period;
      
      console.log('✅ Stats extraites:', stats);
      console.log('✅ Period:', period);
      console.groupEnd();
      
      setAnalytics({
        stats: {
          totalOrders: stats.totalOrders ?? 0,
          totalRevenue: stats.totalRevenue ?? 0,
          avgOrder: stats.avgOrder ?? 0,
          byStatus: stats.byStatus || [],
          byPayment: stats.byPayment || [],
          revenueTrend: stats.revenueTrend || [],
        },
        period,
      });
      
    } catch (err: any) {
      console.error('❌ Error fetching analytics:', err);
      console.error('   Response:', err?.response?.data);
      setError(err?.response?.data?.message || err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ✅ Préparer les données pour le graphique
  const statusChartData = (analytics.stats.byStatus || [])
    .filter(s => s.count > 0)
    .map(s => ({
      name: STATUS_LABELS[s._id] || s._id,
      value: s.count,
      color: STATUS_COLORS[s._id] || '#6B7280',
    }));

  const paymentChartData = (analytics.stats.byPayment || [])
    .filter(p => p.count > 0)
    .map(p => ({
      name: p.method === 'mobile_money' ? 'Mobile Money' :
            p.method === 'cash_on_delivery' ? 'Paiement à la livraison' :
            p.method === 'card' ? 'Carte bancaire' :
            p.method === 'bank_transfer' ? 'Virement' :
            p.method || 'Autre',
      value: p.count,
    }));

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytiques & Rapports</h1>
          <p className="text-muted-foreground">
            Analysez vos données commerciales
            {analytics.period && (
              <span className="ml-2 text-xs">
                (Derniers {analytics.period.days} jours)
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadAnalytics}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="rounded-lg bg-card border border-border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadAnalytics}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="space-y-6">
          
          {/* ═══════ KPI Cards ═══════ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Commandes totales</span>
              </div>
              <p className="text-3xl font-bold">{analytics.stats.totalOrders}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Revenu total</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatPrice(analytics.stats.totalRevenue)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm text-muted-foreground">Panier moyen</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {formatPrice(analytics.stats.avgOrder)}
              </p>
            </motion.div>
          </div>

          {/* ═══════ Graphiques ═══════ */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Répartition par statut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Répartition par statut</h2>
              
              {statusChartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  <p>Aucune donnée disponible</p>
                </div>
              ) : (
                <>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={4}
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color} />
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
                  </div>
                  
                  {/* Légende */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {statusChartData.map((status) => (
                      <div key={status.name} className="flex items-center gap-2 text-sm">
                        <span 
                          className="block h-3 w-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: status.color }} 
                        />
                        <span className="font-medium">{status.name}</span>
                        <span className="text-muted-foreground ml-auto">{status.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* Répartition par méthode de paiement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Méthodes de paiement</h2>
              
              {paymentChartData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  <p>Aucune donnée disponible</p>
                </div>
              ) : (
                <>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={4}
                        >
                          {paymentChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
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
                  </div>
                  
                  {/* Légende */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {paymentChartData.map((payment, index) => (
                      <div key={payment.name} className="flex items-center gap-2 text-sm">
                        <span 
                          className="block h-3 w-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }} 
                        />
                        <span className="font-medium">{payment.name}</span>
                        <span className="text-muted-foreground ml-auto">{payment.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* ═══════ Trend des revenus (si disponible) ═══════ */}
          {analytics.stats.revenueTrend && analytics.stats.revenueTrend.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Tendance des revenus</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Revenu</th>
                      <th className="px-4 py-2 text-right">Commandes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.stats.revenueTrend.slice(-7).map((day) => (
                      <tr key={day.date} className="hover:bg-muted/30">
                        <td className="px-4 py-2">{new Date(day.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-2 text-right font-medium text-green-600">
                          {formatPrice(day.revenue)}
                        </td>
                        <td className="px-4 py-2 text-right">{day.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}