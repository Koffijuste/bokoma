// app/(admin)/dashboard/orders/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Loader2, Eye, Package, Truck, CheckCircle, AlertCircle, Clock, 
  ShoppingBag, User, MapPin, Phone, Mail, CreditCard, FileText,
  Calendar, Hash, ChevronDown, ChevronUp, Copy, ExternalLink,
  Search, Filter, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatPrice, formatDate } from '@/utils/helpers';
import type { Order } from '@/types';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'pending', label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { value: 'confirmed', label: 'Confirmée', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { value: 'processing', label: 'En préparation', icon: Package, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { value: 'delivered', label: 'Livrée', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { value: 'cancelled', label: 'Annulée', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { value: 'refunded', label: 'Remboursée', icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
];

const InfoRow = ({ 
  icon: Icon, 
  label, 
  value, 
  copyable = false 
}: { 
  icon: any; 
  label: string; 
  value: React.ReactNode;
  copyable?: boolean;
}) => {
  const handleCopy = () => {
    if (copyable && typeof value === 'string') {
      navigator.clipboard.writeText(value);
      toast.success('Copié !');
    }
  };

  return (
    <div className="flex items-start gap-3 py-2.5 group hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm break-words">{value || '—'}</p>
          {copyable && typeof value === 'string' && (
            <button 
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
              title="Copier"
            >
              <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderItemCard = ({ item, index }: { item: any; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getProductImage = (): string | null => {
    if (!item?.product) return null;
    
    const product = item.product;
    
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      return typeof img === 'string' ? img : img?.url || img?.imageUrl || null;
    }
    
    if (product.image) return product.image;
    if (product.mainImage) return product.mainImage;
    
    return null;
  };

  const imageUrl = getProductImage();
  const productName = item.product?.name || item.name || 'Produit';
  const productSlug = item.product?.slug;
  const unitPrice = item.price || 0;
  const quantity = item.quantity || 1;
  const totalPrice = unitPrice * quantity;

  return (
    <div 
      className="border border-border rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-left-2"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div 
        className="flex gap-3 p-4 cursor-pointer hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all duration-300"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Image produit */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex-shrink-0 ring-1 ring-border/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={productName}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-product.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-purple-500/10">
              <Package className="w-8 h-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
        
        {/* Infos produit */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="font-semibold text-sm line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">
            {productName}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded-md text-xs font-medium">
              <Hash className="w-3 h-3" /> ×{quantity}
            </span>
            {item.size && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md text-xs font-medium">
                {item.size}
              </span>
            )}
            {item.color && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded-md text-xs font-medium">
                {item.color}
              </span>
            )}
          </div>
        </div>
        
        {/* Prix et toggle */}
        <div className="text-right flex-shrink-0 flex flex-col items-end justify-between gap-2">
          <div>
            <p className="font-bold text-base text-accent">{formatPrice(totalPrice)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPrice(unitPrice)} × {quantity}
            </p>
          </div>
          <div className={`w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Détails expandables */}
      {expanded && (
        <div className="border-t border-border bg-gradient-to-br from-muted/20 to-transparent animate-in slide-in-from-top-2 duration-300">
          <div className="p-4 space-y-3">
            {/* IDs et liens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.product?._id && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">ID Produit:</span>
                  <code className="font-mono bg-background/80 px-2 py-1 rounded-md text-[10px] border border-border/50">
                    {item.product._id}
                  </code>
                </div>
              )}
              
              {productSlug && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Slug:</span>
                  <code className="font-mono bg-background/80 px-2 py-1 rounded-md text-[10px] border border-border/50">
                    {productSlug}
                  </code>
                  <a 
                    href={`/products/${productSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80 inline-flex items-center gap-0.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {item.variant && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Variante:</span>
                  <code className="font-mono bg-background/80 px-2 py-1 rounded-md text-[10px] border border-border/50">
                    {typeof item.variant === 'object' ? item.variant._id : item.variant}
                  </code>
                </div>
              )}

              {item._id && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Item ID:</span>
                  <code className="font-mono bg-background/80 px-2 py-1 rounded-md text-[10px] border border-border/50">
                    {item._id}
                  </code>
                </div>
              )}
            </div>

            {/* Détails prix */}
            <div className="pt-3 border-t border-border/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Prix unitaire</p>
                  <p className="font-semibold text-sm">{formatPrice(unitPrice)}</p>
                </div>
                <div className="p-2.5 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Quantité</p>
                  <p className="font-semibold text-sm">{quantity}</p>
                </div>
                <div className="col-span-2 p-2.5 bg-accent/5 border border-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Sous-total</p>
                  <p className="font-bold text-base text-accent">{formatPrice(totalPrice)}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            {(item.createdAt || item.updatedAt) && (
              <div className="pt-3 border-t border-border/50 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                {item.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ajouté: {formatDate(item.createdAt)}
                  </span>
                )}
                {item.updatedAt && item.updatedAt !== item.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Modifié: {formatDate(item.updatedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function OrdersAdminPage() {
  useRequireAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderApi.getAllOrders({ page: 1, limit: 50 });
      
      const responseData = response?.data || response;
      const ordersData = responseData?.data || responseData;
      const ordersList = ordersData?.orders || ordersData || [];
      
      setOrders(Array.isArray(ordersList) ? ordersList : []);
    } catch (err: any) {
      console.error('❌ Error fetching orders:', err);
      setError(err?.response?.data?.message || err.message || 'Erreur lors du chargement');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (updatingStatus) return;
    try {
      setUpdatingStatus(true);
      
      await orderApi.updateOrderStatus(orderId, newStatus);
      
      toast.success(`Statut mis à jour: ${newStatus}`);
      setMessage(`✅ Statut mis à jour avec succès`);
      
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('❌ Status update error:', err);
      const errorMsg = err?.response?.data?.message || err.message || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'md') => {
    const config = statusOptions.find(s => s.value === status) || statusOptions[0];
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
    
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${config.bg} ${config.color} ${config.border} ${sizeClasses}`}>
        <config.icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {config.label}
      </span>
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  // Filtrage des commandes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Gestion des Commandes</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Suivez et gérez toutes les commandes clients
            </p>
          </div>
          <Button onClick={fetchOrders} variant="outline" className="gap-2">
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.processing}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Livrées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par numéro, email ou nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <opt.icon className={`w-4 h-4 ${opt.color}`} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="w-4 h-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Liste des commandes - Desktop Table */}
      <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commande</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Articles</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Montant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <span className="text-sm">Chargement des commandes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Package className="w-12 h-12 opacity-30" />
                      <p className="text-sm">Aucune commande trouvée</p>
                      <Button variant="outline" size="sm" onClick={fetchOrders} className="mt-2">
                        Rafraîchir
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => (
                  <tr 
                    key={order._id} 
                    className="hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all duration-300 group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono font-semibold text-sm group-hover:text-accent transition-colors">
                          #{order.orderNumber || order._id?.slice(-6)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ID: {order._id?.slice(-8)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm">
                          {order.user?.firstName 
                            ? `${order.user.firstName} ${order.user.lastName || ''}`
                            : order.user?.name || order.shipping?.fullName || 'Client'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.user?.email || order.shipping?.phone || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium">
                          {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-base text-accent">{formatPrice(order.total)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status, 'sm')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        <p>{formatDate(order.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 px-3 text-accent hover:text-accent hover:bg-accent/10 gap-2"
                        onClick={() => openOrderDetails(order)}
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liste des commandes - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Package className="w-12 h-12 opacity-30" />
            <p className="text-sm">Aucune commande trouvée</p>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              Rafraîchir
            </Button>
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <div 
              key={order._id} 
              className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => openOrderDetails(order)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-sm mb-1">
                    #{order.orderNumber || order._id?.slice(-6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.user?.firstName 
                      ? `${order.user.firstName} ${order.user.lastName || ''}`
                      : order.shipping?.fullName || 'Client'}
                  </p>
                </div>
                {getStatusBadge(order.status, 'sm')}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" />
                    {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <p className="font-bold text-base text-accent">{formatPrice(order.total)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de détails */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Commande #${selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6) || '...'}`}
        description="Détails complets de la commande"
        size="3xl"
      >
        {selectedOrder && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 -mr-2">
            {/* Header avec statut */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(selectedOrder.createdAt)}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(selectedOrder._id || '', 'ID commande')}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted"
              >
                ID: {selectedOrder._id?.slice(-12)}... <Copy className="w-3 h-3" />
              </button>
            </div>

            {/* Informations Client */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Informations Client
              </h3>
              <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                <InfoRow 
                  icon={User} 
                  label="Nom complet" 
                  value={
                    selectedOrder.user?.firstName 
                      ? `${selectedOrder.user.firstName} ${selectedOrder.user.lastName || ''}`
                      : selectedOrder.user?.name || selectedOrder.shipping?.fullName || 'N/A'
                  } 
                />
                <InfoRow 
                  icon={Mail} 
                  label="Email" 
                  value={selectedOrder.user?.email || 'N/A'}
                  copyable 
                />
                <InfoRow 
                  icon={Phone} 
                  label="Téléphone" 
                  value={selectedOrder.shipping?.phone || selectedOrder.user?.phone || 'N/A'}
                  copyable 
                />
                {selectedOrder.user?._id && (
                  <InfoRow 
                    icon={Hash} 
                    label="ID Utilisateur" 
                    value={selectedOrder.user._id}
                    copyable 
                  />
                )}
              </div>
            </div>

            {/* Adresse de Livraison */}
            {selectedOrder.shipping && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Adresse de Livraison
                </h3>
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <InfoRow 
                    icon={User} 
                    label="Destinataire" 
                    value={selectedOrder.shipping.fullName || 'N/A'} 
                  />
                  <InfoRow 
                    icon={MapPin} 
                    label="Adresse complète" 
                    value={
                      [
                        selectedOrder.shipping.street,
                        selectedOrder.shipping.city,
                        selectedOrder.shipping.postalCode,
                        selectedOrder.shipping.country,
                      ].filter(Boolean).join(', ') || 'N/A'
                    } 
                  />
                  <InfoRow 
                    icon={Phone} 
                    label="Téléphone de livraison" 
                    value={selectedOrder.shipping.phone || 'N/A'}
                    copyable 
                  />
                  {selectedOrder.shipping.cost !== undefined && (
                    <InfoRow 
                      icon={Truck} 
                      label="Frais de livraison" 
                      value={formatPrice(selectedOrder.shipping.cost)} 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Articles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  Articles ({selectedOrder.items?.length || 0})
                </h3>
                <span className="text-xs text-muted-foreground italic">
                  Cliquez pour détails
                </span>
              </div>
              
              <div className="space-y-2">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item: any, idx: number) => (
                    <OrderItemCard key={item._id || idx} item={item} index={idx} />
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun article dans cette commande</p>
                  </div>
                )}
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-accent" />
                </div>
                Récapitulatif
              </h3>
              <div className="p-4 bg-gradient-to-br from-muted/30 to-transparent border border-border rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">
                    {formatPrice(
                      selectedOrder.items?.reduce((sum, item) => 
                        sum + (item.price || 0) * (item.quantity || 1), 0
                      ) || 0
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-medium">
                    {selectedOrder.shipping?.cost 
                      ? formatPrice(selectedOrder.shipping.cost)
                      : <span className="text-emerald-600">Gratuite</span>}
                  </span>
                </div>

                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span className="flex items-center gap-1">
                      Réduction
                    </span>
                    <span className="font-medium">-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
                  <span className="font-semibold text-base">Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Paiement */}
            {selectedOrder.payment && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Paiement
                </h3>
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <InfoRow 
                    icon={CreditCard} 
                    label="Méthode" 
                    value={
                      selectedOrder.payment.method === 'mobile_money' ? '📱 Mobile Money' :
                      selectedOrder.payment.method === 'cash_on_delivery' ? '🏠 Paiement à la livraison' :
                      selectedOrder.payment.method === 'bank_transfer' ? '🏦 Virement bancaire' :
                      selectedOrder.payment.method || 'N/A'
                    } 
                  />
                  <InfoRow 
                    icon={CheckCircle} 
                    label="Statut du paiement" 
                    value={
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrder.payment.status === 'completed' || selectedOrder.payment.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : selectedOrder.payment.status === 'pending' || selectedOrder.payment.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {selectedOrder.payment.status === 'completed' || selectedOrder.payment.status === 'paid' ? '✅ Payé' :
                         selectedOrder.payment.status === 'pending' ? '⏳ En attente' :
                         selectedOrder.payment.status === 'partial' ? '💰 Partiel' :
                         selectedOrder.payment.status || 'N/A'}
                      </span>
                    } 
                  />
                  {selectedOrder.payment.amountPaid !== undefined && (
                    <InfoRow 
                      icon={Hash} 
                      label="Montant payé" 
                      value={formatPrice(selectedOrder.payment.amountPaid)} 
                    />
                  )}
                  {selectedOrder.payment.transactionId && (
                    <InfoRow 
                      icon={Hash} 
                      label="ID Transaction" 
                      value={selectedOrder.payment.transactionId}
                      copyable 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  Notes
                </h3>
                <div className="p-4 bg-card border border-border rounded-xl">
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              </div>
            )}

            {/* Historique */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                </div>
                Historique
              </h3>
              <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                <InfoRow 
                  icon={Calendar} 
                  label="Créée le" 
                  value={formatDate(selectedOrder.createdAt)} 
                />
                {selectedOrder.updatedAt && selectedOrder.updatedAt !== selectedOrder.createdAt && (
                  <InfoRow 
                    icon={Calendar} 
                    label="Modifiée le" 
                    value={formatDate(selectedOrder.updatedAt)} 
                  />
                )}
              </div>
            </div>

            {/* Mise à jour statut */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-medium flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                </div>
                Mettre à jour le statut
              </label>
              <Select
                value={selectedOrder.status}
                onValueChange={(value) => handleStatusUpdate(selectedOrder._id!, value)}
                disabled={updatingStatus}
              >
                <SelectTrigger className={updatingStatus ? 'opacity-60' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className={`w-4 h-4 ${opt.color}`} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updatingStatus && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Mise à jour en cours...
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}