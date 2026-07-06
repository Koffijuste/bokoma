// app/(admin)/dashboard/orders/page.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Loader2, Eye, Package, Truck, CheckCircle, AlertCircle, Clock,
  ShoppingBag,
  Calendar,
  Search, Filter, RefreshCw, BellRing, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { useOrdersPolling } from '@/hooks/useOrdersPolling';
import { formatPrice, formatDate, cn } from '@/utils/helpers';
import type { Order } from '@/types';
import { toast } from 'sonner';
import { OrderDetailsModal } from './_components/OrderDetailsModal';

// ═══════════════════════════════════════════════════════════════
// 🔹 CONFIGURATION DES STATUTS
// ═══════════════════════════════════════════════════════════════
const statusOptions = [
  { value: 'pending', label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Le client n\'a pas encore payé' },
  { value: 'confirmed', label: 'Confirmée', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Paiement reçu et validé' },
  { value: 'processing', label: 'En préparation', icon: Package, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Préparation en cours' },
  { value: 'shipped', label: 'Expédiée', icon: Truck, color: 'text-cyan-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', desc: 'En cours de livraison' },
  { value: 'delivered', label: 'Livrée', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Livraison effectuée' },
  { value: 'cancelled', label: 'Annulée', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20', desc: 'Commande annulée' },
  { value: 'refunded', label: 'Remboursée', icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-500/10', border: 'border-slate-500/20', desc: 'Remboursement effectué' },
];

// ⚠️ La modale VOIR et les helpers associés ont été déplacés dans
// `./_components/OrderDetailsModal.tsx` pour alléger ce fichier et garantir
// que la taille est TOUJOURS visible (jamais collapsée).



// ═══════════════════════════════════════════════════════════════
// 🔹 COMPOSANT : Modal de Confirmation Suppression
// ═══════════════════════════════════════════════════════════════
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  order,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: Order | null;
  isLoading: boolean;
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border-2 border-destructive/30 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-destructive" />
        </div>

        <h3 className="text-xl font-bold text-center mb-2">
          Supprimer cette commande ?
        </h3>

        <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commande</span>
            <span className="font-mono font-bold">#{order.orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">
              {getUserDisplay(order).name}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-bold text-accent">{formatPrice(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Statut</span>
            <span className="font-medium">{statusOptions.find(s => s.value === order.status)?.label || order.status}</span>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 mb-6">
          <p className="text-xs text-destructive font-medium mb-1">
            ⚠️ Attention : Cette action est irréversible
          </p>
          <p className="text-xs text-muted-foreground">
            La commande sera définitivement supprimée de la base de données. Les stocks seront restaurés si la commande n'était pas annulée.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Supprimer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🔹 COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function OrdersAdminPage() {
  useRequireAdmin();

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    order: Order | null;
  }>({ isOpen: false, order: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchOrders = useCallback(async (): Promise<Order[]> => {
    try {
      const response: any = await orderApi.getAllOrders({ page: 1, limit: 50 });
      const ordersList = response?.data?.orders || response?.orders || [];
      return Array.isArray(ordersList) ? ordersList : [];
    } catch (err: any) {
      console.error('❌ Error fetching orders:', err);
      setError(err?.response?.data?.message || err.message || 'Erreur lors du chargement');
      return [];
    }
  }, []);

  const getUserDisplay = (order: Order): { name: string; email: string } => {
    const u: any = typeof order.user === 'object' && order.user !== null ? order.user : {};
    return {
      name: u.firstName
        ? `${u.firstName} ${u.lastName || ''}`.trim()
        : u.name || order.shipping?.fullName || 'Client',
      email: u.email || order.shipping?.phone || '—',
    };
  };

  const handleNewOrder = useCallback((order: Order) => {
    toast.success('🎉 Nouvelle commande !', {
      description: `#${order.orderNumber} - ${formatPrice(order.total)}`,
      duration: 8000,
    });
    setMessage(`🎉 Nouvelle commande #${order.orderNumber} reçue !`);
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const handleStatusChange = useCallback((order: Order, oldStatus: string, newStatus: string) => {
    const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
    toast.info(`📦 Commande #${order.orderNumber}`, {
      description: `Statut : ${oldStatus} → ${statusLabel}`,
      duration: 5000,
    });
  }, []);

  const { 
    items: orders, 
    loading, 
    newItemIds, 
    lastFetch, 
    refresh, 
    isNew 
  } = useOrdersPolling({
    fetchFn: fetchOrders,
    interval: 5 * 60 * 1000,
    getId: (order) => order._id,
    onNewItem: handleNewOrder,
    onStatusChange: handleStatusChange,
  });

  const openOrderDetails = (order: Order) => {
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

      setSelectedOrder(prev => prev ? { ...prev, status: newStatus as Order['status'] } : null);
      setTimeout(() => setMessage(null), 3000);
      await refresh();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err.message || 'Erreur lors de la mise à jour';
      toast.error(errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openDeleteModal = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteConfirmModal({ isOpen: true, order });
  };

  const closeDeleteModal = () => {
    setDeleteConfirmModal({ isOpen: false, order: null });
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirmModal.order || deletingOrderId) return;

    try {
      setDeletingOrderId(deleteConfirmModal.order._id);
      
      await orderApi.deleteOrder(deleteConfirmModal.order._id);
      
      toast.success('🗑️ Commande supprimée', {
        description: `#${deleteConfirmModal.order.orderNumber} a été supprimée`,
        duration: 5000,
      });

      closeDeleteModal();

      if (selectedOrder?._id === deleteConfirmModal.order._id) {
        setModalOpen(false);
        setSelectedOrder(null);
      }

      await refresh();

    } catch (err: any) {
      console.error('❌ Delete order error:', err);
      const errorMsg = err?.response?.data?.message || err.message || 'Erreur lors de la suppression';
      toast.error(errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeletingOrderId(null);
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

  const filteredOrders = useMemo(() => orders.filter(order => {
    const u: any = typeof order.user === 'object' && order.user !== null ? order.user : {};
    const matchesSearch = searchQuery === '' ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  }), [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }), [orders]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold">Gestion des Commandes</h1>
              {newItemIds.size > 0 && (
                <span className="px-3 py-1 bg-gradient-to-r from-accent to-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 animate-bounce">
                  <BellRing className="w-3 h-3" />
                  {newItemIds.size} nouvelle{newItemIds.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Suivez et gérez toutes les commandes clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  MAJ: {new Date(lastFetch).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            )}
            <Button onClick={refresh} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Rafraîchir
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl hover:shadow-md transition-shadow">
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
          <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl hover:shadow-md transition-shadow">
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
          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl hover:shadow-md transition-shadow">
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
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl hover:shadow-md transition-shadow">
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

      {/* Desktop Table */}
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
                      <Button variant="outline" size="sm" onClick={refresh} className="mt-2">
                        Rafraîchir
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const isOrderNew = isNew(order._id);
                  const isRecent = new Date(order.createdAt).getTime() > Date.now() - 5 * 60 * 1000;
                  const isDeleting = deletingOrderId === order._id;
                  
                  return (
                    <tr 
                      key={order._id} 
                      className={cn(
                        "transition-all duration-500 group",
                        isOrderNew && "bg-accent/10",
                        isRecent && !isOrderNew && "bg-blue-500/5",
                        !isOrderNew && !isRecent && "hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent",
                        isDeleting && "opacity-50"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isOrderNew && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-accent to-purple-500 text-white text-[10px] font-bold rounded-full uppercase animate-pulse">
                              Nouveau
                            </span>
                          )}
                          {isRecent && !isOrderNew && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                              Récent
                            </span>
                          )}
                          <div>
                            <p className="font-mono font-semibold text-sm group-hover:text-accent transition-colors">
                              #{order.orderNumber || order._id?.slice(-6)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ID: {order._id?.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{getUserDisplay(order).name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getUserDisplay(order).email}
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
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-3 text-accent hover:text-accent hover:bg-accent/10 gap-2"
                            onClick={() => openOrderDetails(order)}
                          >
                            <Eye className="w-4 h-4" />
                            Voir
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => openDeleteModal(order, e)}
                            disabled={isDeleting}
                            title="Supprimer"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
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
            <Button variant="outline" size="sm" onClick={refresh}>
              Rafraîchir
            </Button>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const isOrderNew = isNew(order._id);
            const isRecent = new Date(order.createdAt).getTime() > Date.now() - 5 * 60 * 1000;
            const isDeleting = deletingOrderId === order._id;
            
            return (
              <div 
                key={order._id} 
                className={cn(
                  "bg-card border rounded-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                  isOrderNew && "border-accent/50 bg-accent/5 shadow-lg shadow-accent/20",
                  isRecent && !isOrderNew && "border-blue-500/30 bg-blue-500/5",
                  !isOrderNew && !isRecent && "border-border hover:border-accent/40 hover:shadow-md",
                  isDeleting && "opacity-50"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div 
                  className="flex items-start justify-between gap-3 mb-3 cursor-pointer"
                  onClick={() => openOrderDetails(order)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isOrderNew && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-accent to-purple-500 text-white text-[10px] font-bold rounded-full uppercase animate-pulse">
                          Nouveau
                        </span>
                      )}
                      <p className="font-mono font-semibold text-sm">
                        #{order.orderNumber || order._id?.slice(-6)}
                      </p>
                    </div>
<p className="text-xs text-muted-foreground">
                        {getUserDisplay(order).name}
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
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-accent">{formatPrice(order.total)}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => openDeleteModal(order, e)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal VOIR — composant optimisé pour afficher en priorité les tailles/pointures */}
      <OrderDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={selectedOrder}
        onUpdateStatus={handleStatusUpdate}
        onDelete={(order) => openDeleteModal(order)}
        updatingStatus={updatingStatus}
        deleting={deletingOrderId === selectedOrder?._id}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteOrder}
        order={deleteConfirmModal.order}
        isLoading={deletingOrderId !== null}
      />
    </div>
  );
}