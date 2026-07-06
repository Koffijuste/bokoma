// app/(admin)/dashboard/analytics/page.tsx
// ============================================================================
// 📊 ADMIN — Analytiques & Rapports (VERSION OPTIMISÉE)
// ============================================================================
// Optimisations appliquées :
//   • Tous les calculs dérivés sont mémoïsés (useMemo).
//   • Les cartes KPI sont isolées dans React.memo → seul le KPI modifié
//     rerender, pas le tableau entier.
//   • Les PieCharts sont chargés en dynamic + ssr:false (réduisent le TBT).
//   • Les couleurs / libellés sont hoistés hors du composant.
//   • Skeleton réutilisable pour l'état initial.
// ============================================================================
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Loader2, TrendingUp, Package, DollarSign,
  AlertCircle, RefreshCw, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { cn, formatPrice } from '@/utils/helpers';

// ── Charts en lazy-load (pas dans le bundle initial)
const StatusPieChart = dynamic(
  () => import('@/components/admin/charts/StatusPieChart'),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

const PaymentPieChart = dynamic(
  () => import('@/components/admin/charts/PaymentPieChart'),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 TYPES
// ─────────────────────────────────────────────────────────────────────────────

type StatusStat = { _id: string; count: number };

type AnalyticsData = {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    avgOrder: number;
    byStatus?: StatusStat[];
    byPayment?: Array<{ method: string; count: number }>;
    revenueTrend?: Array<{ date: string; revenue: number; orders: number }>;
  };
  period?: { days: number; start: string; end: string };
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 CONSTANTES (hoistées → recréées 0 fois par render)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL: AnalyticsData = {
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

const PAYMENT_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  cash_on_delivery: 'Paiement à la livraison',
  card: 'Carte bancaire',
  bank_transfer: 'Virement',
};

const CHART_HEIGHT = 320;

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 SOUS-COMPOSANTS MÉMOÏSÉS
// ─────────────────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-accent" />
    </div>
  );
}

const KpiCard = React.memo(function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="rounded-xl bg-card border border-border p-6 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
});

const LegendList = React.memo(function LegendList({
  items,
}: {
  items: Array<{ key: string; name: string; value: number; color: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-2 text-sm">
          <span
            className="block h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: it.color }}
          />
          <span className="font-medium truncate">{it.name}</span>
          <span className="text-muted-foreground ml-auto tabular-nums">
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AnalyticsAdminPage() {
  useRequireAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await orderApi.getOrderStats({ days: 30 });

      // ✅ Lecture défensive compatible ApiResponse<…> OU payload nu.
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
      setError(
        err?.response?.data?.message ||
          err.message ||
          'Erreur lors du chargement des statistiques',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // ✅ Décalage d'une frame pour libérer le main thread avant le fetch
    const id = requestAnimationFrame(() => {
      loadAnalytics();
    });
    return () => cancelAnimationFrame(id);
  }, [loadAnalytics]);

  // ── Dérivés mémoïsés (re-calcul uniquement si stats changent) ─────────────
  const statusChartData = useMemo(
    () =>
      (analytics.stats.byStatus || [])
        .filter((s) => s.count > 0)
        .map((s) => ({
          key: s._id,
          name: STATUS_LABELS[s._id] || s._id,
          value: s.count,
          color: STATUS_COLORS[s._id] || '#6B7280',
        })),
    [analytics.stats.byStatus],
  );

  const paymentChartData = useMemo(
    () =>
      (analytics.stats.byPayment || [])
        .filter((p) => p.count > 0)
        .map((p, i) => ({
          key: p.method,
          name: PAYMENT_LABELS[p.method] || p.method || 'Autre',
          value: p.count,
          color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
        })),
    [analytics.stats.byPayment],
  );

  const hasData = analytics.stats.byStatus?.length || analytics.stats.byPayment?.length;

  // ───────────────────────────────────────────────────────────────────────────
  // 🔹 RENDER
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-8">
      <Header
        loading={loading}
        days={analytics.period?.days}
        onRefresh={loadAnalytics}
      />

      {loading && <LoadingBlock />}

      {error && !loading && (
        <ErrorBlock message={error} onRetry={loadAnalytics} />
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* KPI cards — mémoïsées individuellement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Commandes totales"
              value={analytics.stats.totalOrders}
              icon={Package}
              color="bg-blue-500/10 text-blue-500"
              delay={100}
            />
            <KpiCard
              label="Revenu total"
              value={
                <span className="text-green-600">
                  {formatPrice(analytics.stats.totalRevenue)}
                </span>
              }
              icon={DollarSign}
              color="bg-green-500/10 text-green-500"
              delay={200}
            />
            <KpiCard
              label="Panier moyen"
              value={
                <span className="text-purple-600">
                  {formatPrice(analytics.stats.avgOrder)}
                </span>
              }
              icon={TrendingUp}
              color="bg-purple-500/10 text-purple-500"
              delay={300}
            />
          </div>

          {/* Charts */}
          {hasData ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard
                title="Répartition par statut"
                delay={400}
                height={CHART_HEIGHT}
              >
                <StatusPieChart data={statusChartData} />
                <LegendList items={statusChartData} />
              </ChartCard>

              <ChartCard
                title="Méthodes de paiement"
                delay={500}
                height={CHART_HEIGHT}
              >
                <PaymentPieChart data={paymentChartData} />
                <LegendList items={paymentChartData} />
              </ChartCard>
            </div>
          ) : (
            <EmptyAnalyticsBlock />
          )}

          {/* Revenue trend */}
          {analytics.stats.revenueTrend &&
            analytics.stats.revenueTrend.length > 0 && (
              <RevenueTrendTable data={analytics.stats.revenueTrend} />
            )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 BLOCS LÉGERS (mémoïsés)
// ─────────────────────────────────────────────────────────────────────────────

const Header = React.memo(function Header({
  loading,
  days,
  onRefresh,
}: {
  loading: boolean;
  days?: number;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytiques & Rapports</h1>
        <p className="text-muted-foreground">
          Analysez vos données commerciales
          {days ? (
            <span className="ml-2 text-xs">(Derniers {days} jours)</span>
          ) : null}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={loading}
        className="gap-2"
      >
        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        Actualiser
      </Button>
    </div>
  );
});

function LoadingBlock() {
  return (
    <div className="rounded-lg bg-card border border-border p-12 text-center animate-in fade-in zoom-in duration-300">
      <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
      <p className="text-muted-foreground">Chargement des statistiques…</p>
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-6 text-center animate-in fade-in zoom-in duration-300">
      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
      <p className="text-destructive font-medium">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}

const ChartCard = React.memo(function ChartCard({
  title,
  delay,
  height,
  children,
}: {
  title: string;
  delay: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-card border border-border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div style={{ height }}>{children}</div>
    </div>
  );
});

const RevenueTrendTable = React.memo(function RevenueTrendTable({
  data,
}: {
  data: Array<{ date: string; revenue: number; orders: number }>;
}) {
  const last7 = useMemo(() => data.slice(-7), [data]);
  return (
    <div className="rounded-xl bg-card border border-border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            {last7.map((day) => (
              <tr key={day.date} className="hover:bg-muted/30">
                <td className="px-4 py-2">
                  {new Date(day.date).toLocaleDateString('fr-FR')}
                </td>
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
  );
});

function EmptyAnalyticsBlock() {
  return (
    <div className="rounded-xl bg-card border border-border p-12 text-center animate-in fade-in zoom-in duration-300">
      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
      <p className="font-semibold mb-1">Pas encore de données</p>
      <p className="text-sm text-muted-foreground">
        Les graphiques apparaîtront dès que vos premières commandes seront enregistrées.
      </p>
    </div>
  );
}
