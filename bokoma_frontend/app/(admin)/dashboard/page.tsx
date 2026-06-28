// app/(admin)/dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  ShoppingCart, TrendingUp, Package, Users, RefreshCw, 
  Loader2, AlertCircle, LogOut, ExternalLink, Calendar, Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/services/api';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatPrice, formatDate } from '@/utils/helpers';
import { ROUTES } from '@/constants';
import { PaymentAlerts } from '@/components/admin/PaymentAlerts';
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
// ✅ IMPORT DYNAMIQUE des composants de graphiques (client-only)
import dynamic from 'next/dynamic';

const RevenueChart = dynamic(
  () => import('@/components/admin/charts/RevenueChart'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement du graphique...</span>
      </div>
    )
  }
);

const StatusDistributionChart = dynamic(
  () => import('@/components/admin/charts/StatusDistributionChart'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement du graphique...</span>
      </div>
    )
  }
);

// Types
interface DashboardStats {
  orders: number;
  revenue: number;
  products: number;
  customers: number;
}

interface OrderItem {
  _id: string;
  orderNumber?: string;
  user?: { name?: string; email?: string };
  total: number;
  status: string;
  createdAt: string;
}

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAdmin } = useRequireAdmin();
  
  // ✅ État mounted pour forcer le rendu client-only
  const [mounted, setMounted] = useState(false);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ 
    orders: 0, revenue: 0, products: 0, customers: 0 
  });
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusDistribution[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  
  const isMountedRef = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestCountRef = useRef(0);

  const { unreadCount } = usePaymentNotifications(isAdmin, 30000);
  // ✅ Montage côté client
  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (!isMountedRef.current || isRefreshing || !isAdmin) return;
    
    const requestId = ++requestCountRef.current;
    setIsRefreshing(true);
    setApiError(null);
    setChartsLoading(true);

    try {
      const [statsRes, ordersRes, productsRes, usersRes] = await Promise.allSettled([
        apiClient.get('/orders/stats', { signal: AbortSignal.timeout(10000) }),
        apiClient.get('/orders', { params: { limit: 5, page: 1 }, signal: AbortSignal.timeout(10000) }),
        apiClient.get('/products', { params: { limit: 1, page: 1 }, signal: AbortSignal.timeout(10000) }),
        apiClient.get('/users', { params: { limit: 1, page: 1, role: 'customer' }, signal: AbortSignal.timeout(10000) }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        const responseData = (statsRes.value as any).data;
        const s = responseData.data?.stats || responseData.stats || {};
        
        setStats(prev => ({
          ...prev,
          orders: s.totalOrders ?? s.orders ?? 0,
          revenue: s.totalRevenue ?? s.revenue ?? 0,
        }));
        
        const byStatus = responseData.data?.byStatus || s.byStatus;
        if (byStatus && Array.isArray(byStatus)) {
          const formatted = byStatus
            .filter((item: any) => STATUS_COLORS[item.status])
            .map((item: any) => ({
              status: item.status,
              count: item.count,
              color: STATUS_COLORS[item.status],
            }));
          setStatusData(formatted);
        } else {
          setStatusData(generateMockStatusData({ stats: s }));
        }
        
        const revenueTrend = responseData.data?.revenueTrend || s.revenueTrend;
        if (revenueTrend && Array.isArray(revenueTrend)) {
          const formatted = revenueTrend.map((item: any) => ({
            date: formatDate(item.date),
            revenue: item.revenue,
            orders: item.orders,
          }));
          setRevenueData(formatted);
        } else {
          setRevenueData(generateMockRevenueData());
        }
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        const responseData = (ordersRes.value as any).data;
        const ordersData = responseData.data || responseData;
        const ordersList = ordersData.orders || ordersData.products || [];
        setRecentOrders(Array.isArray(ordersList) ? ordersList.slice(0, 5) : []);
      }

      if (productsRes.status === 'fulfilled') {
        const responseData = (productsRes.value as any);
        let totalProducts = 0;
        
        if (responseData.total !== undefined) {
          totalProducts = responseData.total;
        } else if (responseData.data?.total !== undefined) {
          totalProducts = responseData.data.total;
        } else if (Array.isArray(responseData.products)) {
          totalProducts = responseData.products.length;
        } else if (Array.isArray(responseData)) {
          totalProducts = responseData.length;
        }
        
        setStats(prev => ({ ...prev, products: totalProducts }));
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.data) {
        const responseData = (usersRes.value as any).data;
        const usersData = responseData.data || responseData;
        const totalCustomers = usersData.pagination?.total || usersData.total || 0;
        setStats(prev => ({ ...prev, customers: totalCustomers }));
      }

      const isAuthError = [statsRes, ordersRes, productsRes, usersRes].some(
        res => res.status === 'rejected' && (res.reason as any)?.response?.status === 401
      );
      
      if (isAuthError) {
        handleSessionExpired();
        return;
      }

      const hasError = [statsRes, ordersRes, productsRes, usersRes].some(
        res => res.status === 'rejected'
      );
      
      if (hasError) {
        const err = [statsRes, ordersRes, productsRes, usersRes].find(
          res => res.status === 'rejected'
        )?.reason;
        setApiError((err as any)?.message || 'Erreur de chargement');
      }

      setLastUpdated(new Date().toLocaleTimeString('fr-FR'));

    } catch (err: any) {
      if (isMountedRef.current && requestCountRef.current === requestId) {
        setApiError(err?.message || 'Erreur inattendue');
        setRevenueData(generateMockRevenueData());
        setStatusData(generateMockStatusData());
      }
    } finally {
      if (isMountedRef.current && requestCountRef.current === requestId) {
        setIsRefreshing(false);
        setChartsLoading(false);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isMountedRef.current || authLoading || !isAdmin) return;

    refreshData();

    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current && isAdmin && !isRefreshing) {
        refreshData();
      }
    }, 60000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAdmin, authLoading, refreshData]);

  const generateMockRevenueData = useCallback((): RevenueDataPoint[] => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    
    return days.map((day, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: day,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        orders: Math.floor(Math.random() * 20) + 5,
      };
    });
  }, []);

  const generateMockStatusData = useCallback((statsData?: any): StatusDistribution[] => {
    const allStatuses = Object.keys(STATUS_COLORS);
    const totalOrders = statsData?.stats?.totalOrders || stats.orders || 100;
    
    return allStatuses
      .map(status => ({
        status,
        count: Math.floor(Math.random() * (totalOrders * 0.4)),
        color: STATUS_COLORS[status],
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [stats.orders]);

  const handleSessionExpired = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0];
        if (name.startsWith('bokoma_')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bokoma_auth');
    }
    
    setApiError('Session expirée. Redirection...');
    
    setTimeout(() => {
      if (isMountedRef.current) {
        router.push(`${ROUTES.AUTH.LOGIN}?from=${encodeURIComponent('/dashboard')}`);
      }
    }, 1200);
  }, [router]);

  const handleRefresh = useCallback(() => {
    if (!isRefreshing && !apiError) {
      refreshData();
    }
  }, [isRefreshing, apiError, refreshData]);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(c => {
          const name = c.trim().split('=')[0];
          if (name.startsWith('bokoma_')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bokoma_auth');
      }
      router.push(ROUTES.AUTH.LOGIN);
    }
  }, [router]);

  const statCards = useMemo(() => [
    { icon: ShoppingCart, label: 'Commandes', value: stats.orders, change: '+12%', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: TrendingUp, label: 'Revenu', value: formatPrice(stats.revenue), change: '+8%', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Package, label: 'Produits', value: stats.products, change: '+5%', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Users, label: 'Clients', value: stats.customers, change: '+3%', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ], [stats]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" aria-label="Chargement" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Accès restreint</h2>
          <p className="text-muted-foreground mb-6">Cette page est réservée aux administrateurs.</p>
          <Link 
            href={ROUTES.HOME} 
            className="inline-flex px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-background">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord</h1>
          <p className="text-muted-foreground">
            {apiError ? (
              <span className="text-amber-600 font-medium">{apiError}</span>
            ) : (
              `Bienvenue, ${user?.firstName || 'Admin'}`
            )}
          </p>
          {lastUpdated && !apiError && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isRefreshing ? 'Actualisation...' : `Mis à jour à ${lastUpdated}`}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {apiError?.includes('Session') ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-destructive text-white rounded-lg hover:opacity-90 text-sm font-medium flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Se reconnecter
            </button>
          ) : (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm font-medium"
              aria-label="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '...' : 'Actualiser'}
            </button>
          )}
        </div>
      </header>

      {apiError && !apiError.includes('Session') && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Données partielles</p>
              <p className="text-sm text-amber-700">{apiError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 ${stat.bg} rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.color}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">
                {stats.orders === 0 && isRefreshing ? (
                  <span className="inline-block w-16 h-6 bg-muted rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </p>
            </div>
          ))}
        </div>

        {isAdmin && <PaymentAlerts />}
                    
        {/* ✅ GRAPHIQUES - Rendu uniquement après montage client */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Revenu (7 derniers jours)
              </h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {revenueData.length > 0 && (
                  <>
                    {revenueData[0].date} - {revenueData[revenueData.length - 1].date}
                  </>
                )}
              </span>
            </div>
            
            {/* ✅ Conteneur avec hauteur explicite + rendu conditionnel */}
            <div className="w-full" style={{ height: '256px' }}>
              {mounted ? (
                <RevenueChart data={revenueData} loading={chartsLoading} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              )}
            </div>
            
            {revenueData.length > 0 && !chartsLoading && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total période</p>
                  <p className="font-semibold text-green-500">
                    {formatPrice(revenueData.reduce((sum, d) => sum + d.revenue, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commandes totales</p>
                  <p className="font-semibold">
                    {revenueData.reduce((sum, d) => sum + d.orders, 0)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                Répartition des statuts
              </h3>
              <span className="text-xs text-muted-foreground">
                {stats.orders} commande{stats.orders > 1 ? 's' : ''} au total
              </span>
            </div>
            
            {/* ✅ Conteneur avec hauteur explicite + rendu conditionnel */}
            <div className="w-full" style={{ height: '256px' }}>
              {mounted ? (
                <StatusDistributionChart data={statusData} loading={chartsLoading} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              )}
            </div>
            
            {statusData.length > 0 && !chartsLoading && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {statusData.slice(0, 4).map(item => (
                    <span 
                      key={item.status}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {STATUS_LABELS[item.status]}: {item.count}
                    </span>
                  ))}
                  {statusData.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{statusData.length - 4} autres
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Commandes Récentes</h3>
              <p className="text-sm text-muted-foreground">Dernières transactions</p>
            </div>
            <Link 
              href={ROUTES.ADMIN.ORDERS} 
              className="text-sm text-accent hover:underline inline-flex items-center gap-1"
            >
              Voir tout <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {isRefreshing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" aria-hidden="true" />
                    <p>Chargement...</p>
                  </div>
                ) : (
                  <p>Aucune commande récente</p>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Commande', 'Client', 'Date', 'Montant', 'Statut'].map(h => (
                      <th key={h} className="text-left py-3 px-5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    return (
                      <tr key={order._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-5 font-mono text-xs font-medium">
                          #{order.orderNumber?.slice(-6) || order._id?.slice(-6)}
                        </td>
                        <td className="py-3 px-5 text-xs">
                          {order.user?.name || order.user?.email || 'Client'}
                        </td>
                        <td className="py-3 px-5 text-muted-foreground text-xs">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-5 font-medium text-xs">
                          {formatPrice(order.total)}
                        </td>
                        <td className="py-3 px-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium`}
                            style={{ 
                              backgroundColor: `${STATUS_COLORS[order.status] || '#F59E0B'}20`, 
                              color: STATUS_COLORS[order.status] || '#F59E0B' 
                            }}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}