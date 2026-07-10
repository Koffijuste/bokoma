// app/(public)/profile/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { 
  User, Package, Heart, Settings, LogOut, Edit2, Phone, Mail, 
  Calendar, CreditCard, Loader2, ShoppingBag, TrendingUp, Clock, 
  CheckCircle, Truck, XCircle, AlertCircle, Trash2, ExternalLink, 
  Check, RefreshCw, Archive, MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { useWishlist } from '@/hooks/useWishlist';
import { apiClient } from '@/services/api';
import { ROUTES } from '@/constants';
import { formatPrice } from '@/utils/helpers';
import { toast } from 'sonner';
import type { Order } from '@/types';
import { NotificationPermissionToggle } from '@/components/NotificationPermissionToggle';

// ─── Hook focus page ──────────────────────────────────────────────────────────
function usePageFocus(callback: () => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const onFocus      = () => cbRef.current();
    const onVisibility = () => { if (document.visibilityState === 'visible') cbRef.current(); };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

// ─── Extracteur de commandes ──────────────────────────────────────────────────
const extractOrders = (response: any): Order[] => {
  if (!response) return [];
  if (Array.isArray(response.orders))       return response.orders;
  if (Array.isArray(response.data?.orders)) return response.data.orders;
  if (Array.isArray(response.data))         return response.data;
  if (Array.isArray(response))              return response;
  return [];
};

// ─── Statuts ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { label: 'En attente',     color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',   icon: Clock },
  confirmed:  { label: 'Confirmée',      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',      icon: CheckCircle },
  processing: { label: 'En préparation', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',icon: Package },
  shipped:    { label: 'Expédiée',       color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',      icon: Truck },
  delivered:  { label: 'Livrée',         color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle },
  cancelled:  { label: 'Annulée',        color: 'bg-red-500/10 text-red-600 border-red-500/20',         icon: XCircle },
  refunded:   { label: 'Remboursée',     color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',   icon: AlertCircle },
} as const;

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = memo(({ user, size = 80 }: { user: any; size?: number }) => {
  const COLORS = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
  ];
  const initials    = useMemo(() => {
    if (!user) return 'U';
    return ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || 'U';
  }, [user]);
  const colorIndex  = useMemo(() => (!user?.email ? 0 : user.email.charCodeAt(0) % COLORS.length), [user?.email]);

  if (user?.avatar) {
    return <img src={user.avatar} alt="Avatar" className="rounded-full object-cover ring-4 ring-accent/20" style={{ width: size, height: size }} loading="lazy" />;
  }
  return (
    <div className={cn('rounded-full ring-4 ring-accent/20 flex items-center justify-center font-bold text-white bg-gradient-to-br', COLORS[colorIndex])} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
});
Avatar.displayName = 'Avatar';

// ─── OrderCard ────────────────────────────────────────────────────────────────
const OrderCard = memo(({ order, index, onMarkDelivered, onArchiveOrder, isMarkingDelivered, isArchiving }: {
  order: Order; index: number;
  onMarkDelivered: (id: string) => void;
  onArchiveOrder:  (id: string) => void;
  isMarkingDelivered: boolean;
  isArchiving: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className="relative flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 hover:border-accent/50 hover:shadow-md transition-all group animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 40}ms` }}>
      <Link href={`/orders/${order._id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/10 to-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-accent/20 group-hover:to-purple-500/20 transition-all">
          <Package className="w-7 h-7 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">#{order.orderNumber?.slice(-6) || order._id?.slice(-6)}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="font-bold text-lg">{formatPrice(order.total)}</p>
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', cfg.color)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>

        <div className="relative">
          <button onClick={e => { e.preventDefault(); setShowMenu(v => !v); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {order.status === 'confirmed' && (
                  <button
                    onClick={e => { e.preventDefault(); setShowMenu(false); onMarkDelivered(order._id); }}
                    disabled={isMarkingDelivered}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-emerald-500/10 text-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {isMarkingDelivered ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Marquer comme livré
                  </button>
                )}
                <button
                  onClick={e => { e.preventDefault(); setShowMenu(false); onArchiveOrder(order._id); }}
                  disabled={isArchiving}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                >
                  {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  Archiver la commande
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
OrderCard.displayName = 'OrderCard';

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
const ConfirmModal = memo(({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmer', cancelText = 'Annuler', isLoading = false }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmText?: string; cancelText?: string; isLoading?: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">{cancelText}</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading} className="flex-1">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
});
ConfirmModal.displayName = 'ConfirmModal';

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = memo(({ icon: Icon, iconColor, iconBg, label, value, sub, loading }: {
  icon: React.ElementType; iconColor: string; iconBg: string;
  label: string; value: string | number; sub: string; loading: boolean;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-3">
      <div className={cn('p-2 rounded-lg', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    {loading ? (
      <div className="h-8 w-24 bg-muted rounded animate-pulse mb-1" />
    ) : (
      <p className="text-3xl font-bold">{value}</p>
    )}
    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
  </div>
));
StatCard.displayName = 'StatCard';

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const mounted = useMounted();
  const router  = useRouter();
  const { wishlist, loading: wishlistLoading, removeFromWishlist } = useWishlist();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'settings'>('overview');

  // ✅ UNE seule source de vérité pour les commandes
  const [orders,          setOrders]          = useState<Order[]>([]);
  const [loadingOrders,   setLoadingOrders]   = useState(false);
  const [ordersLoaded,    setOrdersLoaded]    = useState(false); // évite double-fetch

  const [markingDeliveredId, setMarkingDeliveredId] = useState<string | null>(null);
  const [archivingOrderId,   setArchivingOrderId]   = useState<string | null>(null);
  const [confirmModal,       setConfirmModal]        = useState<{ isOpen: boolean; orderId: string | null }>({ isOpen: false, orderId: null });

  // ── Fetch TOUTES les commandes (utilisé partout) ──────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!mounted || !isAuthenticated || !user?._id) return;
    if (!silent) setLoadingOrders(true);

    try {
      const response = await apiClient.get('/orders/my', {
        params: { limit: 50, sort: '-createdAt' },
        timeout: 10_000,
      });
      const loaded = extractOrders(response);
      setOrders(loaded);
      setOrdersLoaded(true);
    } catch (err: any) {
      console.error('❌ [Profile] fetchOrders:', err?.message);
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, [mounted, isAuthenticated, user?._id]);

  // ── Fetch au montage (une seule fois) ─────────────────────────────────────
  useEffect(() => {
    if (mounted && isAuthenticated && user?._id && !ordersLoaded && !loadingOrders) {
      fetchOrders();
    }
  }, [mounted, isAuthenticated, user?._id]);

  // ── Refresh silencieux au retour sur la page ───────────────────────────────
  usePageFocus(() => {
    if (mounted && isAuthenticated && user?._id) fetchOrders(true);
  });

  // ── Commandes récentes (5 dernières) ──────────────────────────────────────
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  // ── Stats calculées depuis les commandes ──────────────────────────────────
  // ✅ FIX : stats basées sur `orders` (chargé au montage, pas seulement à l'onglet)
  const stats = useMemo(() => {
    const paid = orders.filter(o => o.status === 'confirmed' || o.status === 'delivered' || o.status === 'shipped');
    return {
      totalOrders:     orders.length,
      totalSpent:      paid.reduce((sum, o) => sum + (o.total ?? 0), 0),
      pendingOrders:   orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
    };
  }, [orders]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return 'N/A';
    return new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  }, [user?.createdAt]);

  // ── Marquer comme livré ────────────────────────────────────────────────────
  const handleMarkAsDelivered = useCallback(async (orderId: string) => {
    setMarkingDeliveredId(orderId);
    try {
      await apiClient.patch(`/orders/${orderId}/delivered`);
      // Mise à jour locale immédiate
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'delivered' } : o));
      toast.success('Commande marquée comme livrée ✅');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la confirmation');
    } finally {
      setMarkingDeliveredId(null);
    }
  }, []);

  // ── Archiver ───────────────────────────────────────────────────────────────
  const handleArchiveOrder  = useCallback((orderId: string) => {
    setConfirmModal({ isOpen: true, orderId });
  }, []);

  const confirmArchiveOrder = useCallback(async () => {
    if (!confirmModal.orderId) return;
    setArchivingOrderId(confirmModal.orderId);
    try {
      await apiClient.patch(`/orders/${confirmModal.orderId}/archive`);
      setOrders(prev => prev.filter(o => o._id !== confirmModal.orderId));
      toast.success('Commande archivée');
      setConfirmModal({ isOpen: false, orderId: null });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'archivage');
    } finally {
      setArchivingOrderId(null);
    }
  }, [confirmModal.orderId]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    logout();
    router.push(ROUTES?.HOME || '/');
  }, [logout, router]);

  const handleRemoveFromWishlist = useCallback(async (productId: string) => {
    await removeFromWishlist(productId);
  }, [removeFromWishlist]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">Veuillez vous connecter pour accéder à votre profil.</p>
          <Button asChild variant="primary" size="lg">
            <Link href={ROUTES?.AUTH?.LOGIN || '/auth/login'}>Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview'  as const, label: 'Vue d\'ensemble', icon: User },
    { id: 'orders'    as const, label: 'Commandes',        icon: Package, badge: stats.totalOrders },
    { id: 'wishlist'  as const, label: 'Favoris',          icon: Heart,   badge: wishlist.length },
    { id: 'settings'  as const, label: 'Paramètres',       icon: Settings },
  ];

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles et vos préférences</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2 sticky top-4">
              <div className="flex items-center gap-3 p-3 mb-4">
                <Avatar user={user} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all',
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium flex-1">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', activeTab === tab.id ? 'bg-background/20' : 'bg-accent/10 text-accent')}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <hr className="border-border my-2" />

              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </aside>

          {/* Contenu principal */}
          <main className="lg:col-span-3 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">

            {/* ── VUE D'ENSEMBLE ─────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Carte profil */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <Avatar user={user} size={100} />
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
                          <p className="text-muted-foreground mt-1">{user?.email}</p>
                          {user?.role && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent mt-3">
                              {user.role === 'admin' ? '👑 Administrateur' : user.role === 'manager' ? '⭐ Gestionnaire' : '👤 Client'}
                            </span>
                          )}
                        </div>
                        <Link href="/profile/settings">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit2 className="w-4 h-4" /> Modifier
                          </Button>
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{user?.email}</span>
                        </div>
                        {user?.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Membre depuis {memberSince}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Stat cards — données en temps réel depuis `orders` */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={Package} iconColor="text-blue-500" iconBg="bg-blue-500/10"
                    label="Commandes" value={stats.totalOrders} loading={loadingOrders && !ordersLoaded}
                    sub={`${stats.deliveredOrders} livrées · ${stats.confirmedOrders} confirmées`}
                  />
                  <StatCard
                    icon={TrendingUp} iconColor="text-green-500" iconBg="bg-green-500/10"
                    label="Total dépensé" value={formatPrice(stats.totalSpent)} loading={loadingOrders && !ordersLoaded}
                    sub={`${stats.pendingOrders} en cours`}
                  />
                  <StatCard
                    icon={Heart} iconColor="text-pink-500" iconBg="bg-pink-500/10"
                    label="Favoris" value={wishlist.length} loading={false}
                    sub="Produits sauvegardés"
                  />
                </div>

                {/* Commandes récentes */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Commandes Récentes</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => fetchOrders()}
                        disabled={loadingOrders}
                        className="text-sm text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={cn('w-4 h-4', loadingOrders && 'animate-spin')} />
                        <span className="hidden sm:inline">Rafraîchir</span>
                      </button>
                      <button onClick={() => setActiveTab('orders')} className="text-sm text-accent hover:underline flex items-center gap-1">
                        Voir tout <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {loadingOrders && !ordersLoaded ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-sm text-muted-foreground">Chargement...</p>
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Aucune commande pour le moment</p>
                      <Link href="/products" className="text-accent hover:underline text-sm mt-2 inline-block">
                        Découvrir nos produits
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.map((order, i) => (
                        <OrderCard
                          key={order._id} order={order} index={i}
                          onMarkDelivered={handleMarkAsDelivered}
                          onArchiveOrder={handleArchiveOrder}
                          isMarkingDelivered={markingDeliveredId === order._id}
                          isArchiving={archivingOrderId === order._id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COMMANDES ──────────────────────────────────────────── */}
            {activeTab === 'orders' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Historique ({orders.length})</h3>
                  <button
                    onClick={() => fetchOrders()}
                    disabled={loadingOrders}
                    className="text-sm text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={cn('w-4 h-4', loadingOrders && 'animate-spin')} />
                    <span className="hidden sm:inline">Rafraîchir</span>
                  </button>
                </div>

                {loadingOrders && !ordersLoaded ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Aucune commande</p>
                    <Link href="/products" className="text-accent hover:underline text-sm mt-2 inline-block">Commencer vos achats</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order, i) => (
                      <OrderCard
                        key={order._id} order={order} index={i}
                        onMarkDelivered={handleMarkAsDelivered}
                        onArchiveOrder={handleArchiveOrder}
                        isMarkingDelivered={markingDeliveredId === order._id}
                        isArchiving={archivingOrderId === order._id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── FAVORIS ────────────────────────────────────────────── */}
            {activeTab === 'wishlist' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <h3 className="font-semibold text-lg mb-4">Mes Favoris ({wishlist.length})</h3>

                {wishlistLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  </div>
                ) : wishlist.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">Votre liste de favoris est vide</p>
                    <Link href="/products" className="text-accent hover:underline text-sm">Découvrir nos produits</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((product: any, i: number) => (
                      <div key={product._id} className="flex gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                        <Link href={`/products/${product.slug || product._id}`} className="flex-shrink-0">
                          <img
                            src={product.images?.[0]?.url || product.images?.[0] || 'https://placehold.co/100x100'}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                            loading="lazy"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${product.slug || product._id}`}>
                            <h4 className="font-medium line-clamp-2 hover:text-accent transition">{product.name}</h4>
                          </Link>
                          {product.brand && <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>}
                          <p className="text-lg font-bold text-accent mt-2">{formatPrice(product.basePrice || 0)}</p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleRemoveFromWishlist(product._id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          title="Retirer des favoris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PARAMÈTRES ─────────────────────────────────────────── */}
            {activeTab === 'settings' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <h3 className="font-semibold text-lg mb-4">Paramètres du Compte</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Informations personnelles</h4>
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Prénom</label>
                          <p className="font-medium">{user?.firstName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Nom</label>
                          <p className="font-medium">{user?.lastName || 'N/A'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Email</label>
                        <p className="font-medium">{user?.email || 'N/A'}</p>
                      </div>
                      {user?.phone && (
                        <div>
                          <label className="text-sm text-muted-foreground">Téléphone</label>
                          <p className="font-medium">{user.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <hr className="border-border" />

                  {/* 🔔 Notifications de commande (PWA Web Push) */}
                  <div>
                    <h4 className="font-medium mb-3">Notifications</h4>
                    <NotificationPermissionToggle />
                  </div>

                  <hr className="border-border" />

                  <div className="space-y-3">
                    <Link href="/profile/settings">
                      <Button variant="outline" className="w-full gap-2">
                        <Edit2 className="w-4 h-4" /> Modifier mes informations
                      </Button>
                    </Link>
                    <Link href="/profile/settings">
                      <Button variant="outline" className="w-full gap-2">
                        <CreditCard className="w-4 h-4" /> Changer mon mot de passe
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, orderId: null })}
        onConfirm={confirmArchiveOrder}
        title="Archiver la commande ?"
        message="Cette commande sera masquée de votre historique. Cette action est irréversible."
        confirmText="Archiver"
        cancelText="Annuler"
        isLoading={archivingOrderId !== null}
      />
    </div>
  );
}