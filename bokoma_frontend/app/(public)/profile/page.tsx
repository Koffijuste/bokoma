// app/(public)/profile/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Package, Heart, Settings, LogOut, Edit2, MapPin, Phone, Mail, 
  Calendar, CreditCard, Loader2, ShoppingBag, TrendingUp, Clock, 
  CheckCircle, Truck, XCircle, AlertCircle, Trash2, ExternalLink
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
import type { Order, Product } from '@/types';

// ============================================================================
// 🔹 HELPERS
// ============================================================================

/**
 * Avatar avec initiales (pas de service externe)
 */
const Avatar = ({ user, size = 80 }: { user: any; size?: number }) => {
  const initials = useMemo(() => {
    if (!user) return 'U';
    const first = user.firstName?.[0]?.toUpperCase() || '';
    const last = user.lastName?.[0]?.toUpperCase() || '';
    return (first + last) || 'U';
  }, [user]);

  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
  ];

  const colorIndex = useMemo(() => {
    if (!user?.email) return 0;
    return user.email.charCodeAt(0) % colors.length;
  }, [user?.email, colors.length]);

  if (user?.avatar) {
    return (
      <img 
        src={user.avatar} 
        alt="Avatar" 
        className="rounded-full object-cover ring-4 ring-accent/20"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div 
      className={cn(
        'rounded-full ring-4 ring-accent/20 flex items-center justify-center font-bold text-white bg-gradient-to-br',
        colors[colorIndex]
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
};

/**
 * Parsing défensif de la réponse API pour extraire les commandes
 */
const extractOrders = (response: any): Order[] => {
  if (!response) return [];
  
  // Format 1: Array direct
  if (Array.isArray(response)) return response;
  
  // Format 2: { orders: [...] }
  if (Array.isArray(response.orders)) return response.orders;
  
  // Format 3: { results: [...] }
  if (Array.isArray(response.results)) return response.results;
  
  // Format 4: { data: { orders: [...] } }
  if (response.data && Array.isArray(response.data.orders)) return response.data.orders;
  
  // Format 5: { data: [...] }
  if (Array.isArray(response.data)) return response.data;
  
  console.warn('⚠️ [Profile] Unexpected orders response format:', response);
  return [];
};

/**
 * Configuration des statuts de commande
 */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: CheckCircle },
  processing: { label: 'En préparation', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Package },
  shipped: { label: 'Expédiée', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
  refunded: { label: 'Remboursée', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', icon: AlertCircle },
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const mounted = useMounted();
  const router = useRouter();
  const { wishlist, loading: wishlistLoading, removeFromWishlist } = useWishlist();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'settings'>('overview');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAllOrders, setLoadingAllOrders] = useState(false);

  // ============================================================================
  // 🔹 FETCH DATA
  // ============================================================================

  const fetchRecentOrders = useCallback(async () => {
    if (!mounted || !isAuthenticated || !user?._id) return;
    
    try {
      setLoadingOrders(true);
      const response = await apiClient.get('/orders/my', { 
        params: { limit: 5, sort: '-createdAt' },
        timeout: 8000,
      });
      
      const orders = extractOrders(response);
      console.log('📦 [Profile] Recent orders loaded:', orders.length);
      setRecentOrders(orders);
      
    } catch (err) {
      console.error('❌ [Profile] Failed to fetch recent orders:', err);
      setRecentOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [mounted, isAuthenticated, user?._id]);

  const fetchAllOrders = useCallback(async () => {
    if (!mounted || !isAuthenticated || !user?._id) return;
    
    try {
      setLoadingAllOrders(true);
      const response = await apiClient.get('/orders/my', { 
        params: { limit: 50, sort: '-createdAt' },
        timeout: 10000,
      });
      
      const orders = extractOrders(response);
      console.log('📦 [Profile] All orders loaded:', orders.length);
      setAllOrders(orders);
      
    } catch (err) {
      console.error('❌ [Profile] Failed to fetch all orders:', err);
      setAllOrders([]);
    } finally {
      setLoadingAllOrders(false);
    }
  }, [mounted, isAuthenticated, user?._id]);

  useEffect(() => {
    if (activeTab === 'overview') fetchRecentOrders();
  }, [activeTab, fetchRecentOrders]);

  useEffect(() => {
    if (activeTab === 'orders') fetchAllOrders();
  }, [activeTab, fetchAllOrders]);

  // ============================================================================
  // 🔹 HANDLERS
  // ============================================================================

  const handleLogout = useCallback(() => {
    logout();
    router.push(ROUTES?.HOME || '/');
  }, [logout, router]);

  const handleRemoveFromWishlist = useCallback(async (productId: string) => {
    const success = await removeFromWishlist(productId);
    if (success) {
      console.log('✅ [Profile] Removed from wishlist:', productId);
    }
  }, [removeFromWishlist]);

  // ============================================================================
  // 🔹 COMPUTED VALUES
  // ============================================================================

  const stats = useMemo(() => ({
    totalOrders: allOrders.length,
    totalSpent: allOrders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length,
    deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
  }), [allOrders]);

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return 'N/A';
    return new Date(user.createdAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    });
  }, [user?.createdAt]);

  // ============================================================================
  // 🔹 LOADING STATES
  // ============================================================================

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">
            Veuillez vous connecter pour accéder à votre profil.
          </p>
          <Button asChild variant="primary" size="lg">
            <Link href={ROUTES?.AUTH?.LOGIN || '/auth/login'}>
              Se connecter
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 TABS CONFIG
  // ============================================================================

  const tabs = [
    { id: 'overview' as const, label: 'Vue d\'ensemble', icon: User },
    { id: 'orders' as const, label: 'Commandes', icon: Package, badge: stats.totalOrders },
    { id: 'wishlist' as const, label: 'Favoris', icon: Heart, badge: wishlist.length },
    { id: 'settings' as const, label: 'Paramètres', icon: Settings },
  ];

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et vos préférences
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Sidebar */}
          <motion.aside 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="lg:col-span-1"
          >
            <div className="bg-card border border-border rounded-xl p-4 space-y-2 sticky top-4">
              
              {/* User info in sidebar */}
              <div className="flex items-center gap-3 p-3 mb-4">
                <Avatar user={user} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              {tabs.map((tab) => {
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
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        activeTab === tab.id 
                          ? 'bg-background/20' 
                          : 'bg-accent/10 text-accent'
                      )}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
              
              <hr className="border-border my-2" />
              
              {/* Logout */}
              <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </motion.aside>

          {/* Main Content */}
          <motion.main 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="lg:col-span-3 space-y-6"
          >
            <AnimatePresence mode="wait">
              
              {/* ============================================================ */}
              {/* OVERVIEW TAB */}
              {/* ============================================================ */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* User Card */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <Avatar user={user} size={100} />
                      
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <h2 className="text-2xl font-bold">
                              {user?.firstName} {user?.lastName}
                            </h2>
                            <p className="text-muted-foreground mt-1">{user?.email}</p>
                            {user?.role && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent mt-3">
                                {user.role === 'admin' ? '👑 Administrateur' : 
                                 user.role === 'manager' ? '⭐ Gestionnaire' : 
                                 '👤 Client'}
                              </span>
                            )}
                          </div>
                          
                          <Link href={ROUTES?.USER?.SETTINGS || '/profile?tab=settings'}>
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

                  {/* Stats Cards */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-card border border-border rounded-xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Package className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Commandes</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.totalOrders}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.deliveredOrders} livrées
                      </p>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-card border border-border rounded-xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Total dépensé</span>
                      </div>
                      <p className="text-3xl font-bold">{formatPrice(stats.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.pendingOrders} en cours
                      </p>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-card border border-border rounded-xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-pink-500/10 rounded-lg">
                          <Heart className="w-5 h-5 text-pink-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">Favoris</span>
                      </div>
                      <p className="text-3xl font-bold">{wishlist.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Produits sauvegardés
                      </p>
                    </motion.div>
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Commandes Récentes</h3>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="text-sm text-accent hover:underline flex items-center gap-1"
                      >
                        Voir tout
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {loadingOrders ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <p className="text-sm text-muted-foreground">Chargement...</p>
                      </div>
                    ) : !Array.isArray(recentOrders) || recentOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Aucune commande pour le moment</p>
                        <Link 
                          href={ROUTES?.PRODUCTS || '/products'} 
                          className="text-accent hover:underline text-sm mt-2 inline-block"
                        >
                          Découvrir nos produits
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentOrders.map((order, index) => {
                          const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                          const StatusIcon = statusConfig.icon;
                          
                          return (
                            <motion.div
                              key={order._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Link 
                                href={`/orders/${order._id}`}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-accent/50 transition-all group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                                    <Package className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      #{order.orderNumber?.slice(-6) || order._id?.slice(-6)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{formatPrice(order.total)}</p>
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                    statusConfig.color
                                  )}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig.label}
                                  </span>
                                </div>
                              </Link>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ============================================================ */}
              {/* ORDERS TAB */}
              {/* ============================================================ */}
              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <h3 className="font-semibold text-lg mb-4">
                    Historique des Commandes ({allOrders.length})
                  </h3>
                  
                  {loadingAllOrders ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-sm text-muted-foreground">Chargement...</p>
                    </div>
                  ) : !Array.isArray(allOrders) || allOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Aucune commande</p>
                      <Link 
                        href={ROUTES?.PRODUCTS || '/products'} 
                        className="text-accent hover:underline text-sm mt-2 inline-block"
                      >
                        Commencer vos achats
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allOrders.map((order, index) => {
                        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                          <motion.div
                            key={order._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Link 
                              href={`/orders/${order._id}`}
                              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-accent/50 transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                                  <Package className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    #{order.orderNumber?.slice(-6) || order._id?.slice(-6)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatPrice(order.total)}</p>
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                  statusConfig.color
                                )}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ============================================================ */}
              {/* WISHLIST TAB */}
              {/* ============================================================ */}
              {activeTab === 'wishlist' && (
                <motion.div
                  key="wishlist"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <h3 className="font-semibold text-lg mb-4">
                    Mes Favoris ({wishlist.length})
                  </h3>
                  
                  {wishlistLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-sm text-muted-foreground">Chargement...</p>
                    </div>
                  ) : !Array.isArray(wishlist) || wishlist.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">
                        Votre liste de favoris est vide
                      </p>
                      <Link 
                        href={ROUTES?.PRODUCTS || '/products'} 
                        className="text-accent hover:underline text-sm"
                      >
                        Découvrir nos produits
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {wishlist.map((product, index) => (
                        <motion.div
                          key={product._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Link href={`/products/${product.slug || product._id}`} className="flex-shrink-0">
                            <img
                              src={product.images?.[0]?.url || product.images?.[0] || 'https://placehold.co/100x100'}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${product.slug || product._id}`}>
                              <h4 className="font-medium line-clamp-2 hover:text-accent transition">
                                {product.name}
                              </h4>
                            </Link>
                            {product.brand && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {product.brand}
                              </p>
                            )}
                            <p className="text-lg font-bold text-accent mt-2">
                              {formatPrice(product.basePrice || 0)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFromWishlist(product._id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            title="Retirer des favoris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ============================================================ */}
              {/* SETTINGS TAB */}
              {/* ============================================================ */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <h3 className="font-semibold text-lg mb-4">Paramètres du Compte</h3>
                  
                  <div className="space-y-6">
                    {/* Personal Info */}
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

                    {/* Actions */}
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full gap-2">
                        <Edit2 className="w-4 h-4" />
                        Modifier mes informations
                      </Button>
                      <Button variant="outline" className="w-full gap-2">
                        <CreditCard className="w-4 h-4" />
                        Changer mon mot de passe
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.main>
        </div>
      </div>
    </div>
  );
}