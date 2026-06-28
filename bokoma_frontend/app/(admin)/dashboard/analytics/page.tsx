// app/(admin)/dashboard/analytics/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, TrendingUp, Package, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/helpers';

// ✅ DEUX imports dynamiques séparés (pas un objet)
const StatusPieChart = dynamic(
  () => import('@/components/admin/charts/StatusPieChart'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[320px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    )
  }
);

const PaymentPieChart = dynamic(
  () => import('@/components/admin/charts/PaymentPieChart'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[320px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    )
  }
);

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

export default function AnalyticsAdminPage() {
  useRequireAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderApi.getOrderStats({ days: 30 });
      
      const responseData = (response as any)?.data || response;
      const analyticsData = responseData?.data || responseData;
      const stats = analyticsData?.stats || {};
      const period = analyticsData?.period;
      
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
      setError(err?.response?.data?.message || err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      loadAnalytics();
    }
  }, [mounted, loadAnalytics]);

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
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
      </div>

      {loading && (
        <div className="rounded-lg bg-card border border-border p-12 text-center animate-in fade-in zoom-in duration-300">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-6 text-center animate-in fade-in zoom-in duration-300">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadAnalytics}>
            Réessayer
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border p-6 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Commandes totales</span>
              </div>
              <p className="text-3xl font-bold">{analytics.stats.totalOrders}</p>
            </div>

            <div className="rounded-xl bg-card border border-border p-6 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Revenu total</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatPrice(analytics.stats.totalRevenue)}
              </p>
            </div>

            <div className="rounded-xl bg-card border border-border p-6 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm text-muted-foreground">Panier moyen</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {formatPrice(analytics.stats.avgOrder)}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* ✅ GRAPHIQUE 1 : StatusPieChart utilisé directement */}
            <div className="rounded-xl bg-card border border-border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms' }}>
              <h2 className="text-lg font-semibold mb-4">Répartition par statut</h2>
              
              <div style={{ height: '320px' }}>
                {mounted ? (
                  <StatusPieChart data={statusChartData} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}
              </div>
              
              {statusChartData.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {statusChartData.map((status, index) => (
                    <div key={`status-${status.name}-${index}`} className="flex items-center gap-2 text-sm">
                      <span 
                        className="block h-3 w-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: status.color }} 
                      />
                      <span className="font-medium">{status.name}</span>
                      <span className="text-muted-foreground ml-auto">{status.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ GRAPHIQUE 2 : PaymentPieChart utilisé directement */}
            <div className="rounded-xl bg-card border border-border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms' }}>
              <h2 className="text-lg font-semibold mb-4">Méthodes de paiement</h2>
              
              <div style={{ height: '320px' }}>
                {mounted ? (
                  <PaymentPieChart data={paymentChartData} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}
              </div>
              
              {paymentChartData.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {paymentChartData.map((payment, index) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
                    return (
                      <div key={`payment-${payment.name}-${index}`} className="flex items-center gap-2 text-sm">
                        <span 
                          className="block h-3 w-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: colors[index % colors.length] }} 
                        />
                        <span className="font-medium">{payment.name}</span>
                        <span className="text-muted-foreground ml-auto">{payment.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {analytics.stats.revenueTrend && analytics.stats.revenueTrend.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '600ms' }}>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}