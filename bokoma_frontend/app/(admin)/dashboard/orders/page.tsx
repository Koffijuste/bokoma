// app/(admin)/dashboard/orders/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye, Package, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { orderApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatPrice, formatDate } from '@/utils/helpers';
import type { Order } from '@/types';

const statusOptions = [
  { value: 'pending', label: 'En attente', icon: Clock },
  { value: 'processing', label: 'En préparation', icon: Package },
  { value: 'shipped', label: 'Expédiée', icon: Truck },
  { value: 'delivered', label: 'Livrée', icon: CheckCircle },
  { value: 'cancelled', label: 'Annulée', icon: AlertCircle },
];

export default function OrdersAdminPage() {
  useRequireAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderApi.getAllOrders({ page: 1, limit: 50 });
      setOrders(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error fetching orders:', err);
      setError(err.message || 'Erreur lors du chargement des commandes');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (updatingStatus) return;
    try {
      setUpdatingStatus(true);
      await orderApi.updateOrderStatus(orderId, newStatus);
      setMessage(`✅ Statut mis à jour avec succès`);
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string }> = {
      pending: { class: 'bg-yellow-500/10 text-yellow-600', label: 'En attente' },
      processing: { class: 'bg-blue-500/10 text-blue-600', label: 'En préparation' },
      shipped: { class: 'bg-purple-500/10 text-purple-600', label: 'Expédiée' },
      delivered: { class: 'bg-green-500/10 text-green-600', label: 'Livrée' },
      cancelled: { class: 'bg-red-500/10 text-red-600', label: 'Annulée' },
    };
    const { class: className, label } = config[status] || config.pending;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>;
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des Commandes</h1>
          <p className="text-muted-foreground">
            Suivez, mettez à jour et gérez toutes les commandes clients
          </p>
        </div>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Commande</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement des commandes...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Package className="w-12 h-12 opacity-50" />
                      <p>Aucune commande trouvée</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold">#{order.orderNumber || order._id?.slice(-6)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{order.user?.name || order.user?.email || 'Client'}</p>
                        <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-accent hover:text-accent/80" onClick={() => openOrderDetails(order)}>
                        <Eye className="w-4 h-4 mr-1" /> Voir
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Order Details Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Commande #${selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6) || '...'}`}
        description="Détails de la commande et mise à jour du statut"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Client Info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Client</h3>
              <p className="font-medium">{selectedOrder.user?.name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder.user?.email || 'N/A'}</p>
            </div>

            {/* Status Update */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Mettre à jour le statut</label>
              <Select
                options={statusOptions.map(o => ({ value: o.value, label: o.label }))}
                value={selectedOrder.status}
                onChange={(value) => handleStatusUpdate(selectedOrder._id!, value)}
              />
              {updatingStatus && <p className="text-xs text-muted-foreground">Mise à jour en cours...</p>}
            </div>

            {/* Order Items */}
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Articles ({selectedOrder.items.length})</h3>
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <li key={item._id || idx} className="flex justify-between text-sm border-b border-border pb-2 last:border-0">
                      <span>{item.product?.name || 'Produit'}</span>
                      <span className="font-medium">x{item.quantity} • {formatPrice(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-accent/10 rounded-lg border border-accent/20">
              <span className="font-semibold">Total Commande</span>
              <span className="text-xl font-bold text-accent">{formatPrice(selectedOrder.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}