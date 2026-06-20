// app/(admin)/dashboard/orders/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Eye, Package, Truck, CheckCircle, AlertCircle, Clock, 
  ShoppingBag, User, MapPin, Phone, Mail, CreditCard, FileText,
  Calendar, Hash, ChevronDown, ChevronUp, Copy, ExternalLink
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
  { value: 'pending', label: 'En attente', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  { value: 'confirmed', label: 'Confirmée', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { value: 'processing', label: 'En préparation', icon: Package, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  { value: 'shipped', label: 'Expédiée', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
  { value: 'delivered', label: 'Livrée', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500/10' },
  { value: 'cancelled', label: 'Annulée', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
  { value: 'refunded', label: 'Remboursée', icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-500/10' },
];

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : InfoRow
// ─────────────────────────────────────────────────────────────
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
      toast.success('Copié dans le presse-papier');
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm break-words">{value || '—'}</p>
          {copyable && typeof value === 'string' && (
            <button 
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
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

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : OrderItemCard
// ─────────────────────────────────────────────────────────────
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
  const productName = item.product?.name || 'Produit';
  const productSlug = item.product?.slug;
  const unitPrice = item.price || 0;
  const quantity = item.quantity || 1;
  const totalPrice = unitPrice * quantity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-lg overflow-hidden hover:border-accent/30 transition-colors"
    >
      {/* Header de l'item */}
      <div 
        className="flex gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Image */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={productName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-product.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
        </div>
        
        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{productName}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Hash className="w-3 h-3" /> Qté: {quantity}
            </span>
            {item.size && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded">
                Taille: {item.size}
              </span>
            )}
            {item.color && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded">
                Couleur: {item.color}
              </span>
            )}
          </div>
        </div>
        
        {/* Prix + Toggle */}
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
          <p className="font-semibold text-sm">{formatPrice(totalPrice)}</p>
          <p className="text-xs text-muted-foreground">{formatPrice(unitPrice)} × {quantity}</p>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Détails expandables */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-3 bg-muted/20 space-y-2 text-xs">
              {/* ID du produit */}
              {item.product?._id && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">ID Produit:</span>
                  <code className="font-mono bg-background px-1.5 py-0.5 rounded text-[10px]">
                    {item.product._id}
                  </code>
                </div>
              )}
              
              {/* Slug */}
              {productSlug && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Slug:</span>
                  <code className="font-mono bg-background px-1.5 py-0.5 rounded text-[10px]">
                    {productSlug}
                  </code>
                  <a 
                    href={`/products/${productSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    Voir <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Variant ID */}
              {item.variant && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Variante:</span>
                  <code className="font-mono bg-background px-1.5 py-0.5 rounded text-[10px]">
                    {typeof item.variant === 'object' ? item.variant._id : item.variant}
                  </code>
                </div>
              )}

              {/* Item ID */}
              {item._id && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Item ID:</span>
                  <code className="font-mono bg-background px-1.5 py-0.5 rounded text-[10px]">
                    {item._id}
                  </code>
                </div>
              )}

              {/* Prix détaillé */}
              <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Prix unitaire:</span>
                  <p className="font-medium">{formatPrice(unitPrice)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantité:</span>
                  <p className="font-medium">{quantity}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sous-total:</span>
                  <p className="font-medium text-accent">{formatPrice(totalPrice)}</p>
                </div>
                {item.price !== unitPrice && (
                  <div>
                    <span className="text-muted-foreground">Prix original:</span>
                    <p className="font-medium line-through">{formatPrice(item.price)}</p>
                  </div>
                )}
              </div>

              {/* Dates */}
              {(item.createdAt || item.updatedAt) && (
                <div className="pt-2 border-t border-border/50 flex gap-4 text-[10px] text-muted-foreground">
                  {item.createdAt && (
                    <span>Ajouté: {formatDate(item.createdAt)}</span>
                  )}
                  {item.updatedAt && item.updatedAt !== item.createdAt && (
                    <span>Modifié: {formatDate(item.updatedAt)}</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function OrdersAdminPage() {
  useRequireAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ───────── FETCH ─────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📦 [Orders] Fetching orders...');
      const response = await orderApi.getAllOrders({ page: 1, limit: 50 });
      
      console.group('📦 [Orders] Parsing response');
      console.log('📥 Response complète:', response);
      
      const responseData = response?.data || response;
      const ordersData = responseData?.data || responseData;
      const ordersList = ordersData?.orders || ordersData || [];
      
      console.log('✅ Orders extraits:', Array.isArray(ordersList) ? ordersList.length : 0);
      
      if (Array.isArray(ordersList) && ordersList.length > 0) {
        console.log('📋 Première commande complète:', ordersList[0]);
        console.log('📋 Items:', ordersList[0].items);
        console.log('📋 User:', ordersList[0].user);
        console.log('📋 Shipping:', ordersList[0].shipping);
        console.log('📋 Payment:', ordersList[0].payment);
      }
      
      console.groupEnd();
      
      setOrders(Array.isArray(ordersList) ? ordersList : []);
    } catch (err: any) {
      console.error('❌ Error fetching orders:', err);
      console.error('   Response:', err?.response?.data);
      
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
    console.group('👁️ [Orders] Ouverture commande');
    console.log('🆔 ID:', order._id);
    console.log('📋 Order complète:', order);
    console.log('📦 Items:', order.items);
    console.log('👤 User:', order.user);
    console.log('🚚 Shipping:', order.shipping);
    console.log('💳 Payment:', order.payment);
    console.groupEnd();
    
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (updatingStatus) return;
    try {
      setUpdatingStatus(true);
      console.log('🔄 [Orders] Updating status:', orderId, '->', newStatus);
      
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

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <config.icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
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
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
            {orders.length} commande{orders.length > 1 ? 's' : ''}
          </span>
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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Articles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement des commandes...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Package className="w-12 h-12 opacity-50" />
                      <p>Aucune commande trouvée</p>
                      <Button variant="outline" size="sm" onClick={fetchOrders}>
                        Rafraîchir
                      </Button>
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
                        <p className="font-medium">
                          {order.user?.firstName 
                            ? `${order.user.firstName} ${order.user.lastName || ''}`
                            : order.user?.name || order.shipping?.fullName || 'Client'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.user?.email || order.shipping?.phone || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                        </span>
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ORDER DETAILS MODAL - ENRICHI */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Commande #${selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6) || '...'}`}
        description="Détails complets de la commande"
        size="3xl"
      >
        {selectedOrder && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            
            {/* ════════ HEADER : Statut + ID ════════ */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {formatDate(selectedOrder.createdAt)}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(selectedOrder._id || '', 'ID commande')}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                ID: {selectedOrder._id?.slice(-12)}... <Copy className="w-3 h-3" />
              </button>
            </div>

            {/* ════════ CLIENT ════════ */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <User className="w-4 h-4" /> Informations Client
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

            {/* ════════ LIVRAISON ════════ */}
            {selectedOrder.shipping && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Adresse de Livraison
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

            {/* ════════ ARTICLES ════════ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> 
                  Articles ({selectedOrder.items?.length || 0})
                </h3>
                <span className="text-xs text-muted-foreground">
                  Cliquez sur un article pour voir les détails
                </span>
              </div>
              
              <div className="space-y-2">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item: any, idx: number) => (
                    <OrderItemCard key={item._id || idx} item={item} index={idx} />
                  ))
                ) : (
                  <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun article dans cette commande</p>
                  </div>
                )}
              </div>
            </div>

            {/* ════════ RÉCAPITULATIF FINANCIER ════════ */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Récapitulatif
              </h3>
              <div className="p-4 bg-card border border-border rounded-xl space-y-2">
                {/* Sous-total */}
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

                {/* Livraison */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-medium">
                    {selectedOrder.shipping?.cost 
                      ? formatPrice(selectedOrder.shipping.cost)
                      : 'Gratuite'}
                  </span>
                </div>

                {/* Réduction */}
                {selectedOrder.coupon?.discount && selectedOrder.coupon.discount > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        Réduction ({selectedOrder.coupon.code})
                      </span>
                      <span className="font-medium">-{formatPrice(selectedOrder.coupon.discount)}</span>
                    </div>
                  </>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-accent">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* ════════ PAIEMENT ════════ */}
            {selectedOrder.payment && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Paiement
                </h3>
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <InfoRow 
                    icon={CreditCard} 
                    label="Méthode" 
                    value={
                      selectedOrder.payment.method === 'mobile_money' ? 'Mobile Money' :
                      selectedOrder.payment.method === 'cash_on_delivery' ? 'Paiement à la livraison' :
                      selectedOrder.payment.method === 'bank_transfer' ? 'Virement bancaire' :
                      selectedOrder.payment.method || 'N/A'
                    } 
                  />
                  <InfoRow 
                    icon={CheckCircle} 
                    label="Statut du paiement" 
                    value={
                      <span className={`inline-flex items-center gap-1 ${
                        selectedOrder.payment.status === 'completed' || selectedOrder.payment.status === 'paid' 
                          ? 'text-green-600' 
                          : selectedOrder.payment.status === 'pending' || selectedOrder.payment.status === 'partial'
                            ? 'text-yellow-600'
                            : 'text-muted-foreground'
                      }`}>
                        {selectedOrder.payment.status === 'completed' || selectedOrder.payment.status === 'paid' ? '✅' :
                         selectedOrder.payment.status === 'pending' ? '⏳' :
                         selectedOrder.payment.status === 'partial' ? '💰' : '❌'}
                        {' '}
                        {selectedOrder.payment.status === 'completed' ? 'Payé' :
                         selectedOrder.payment.status === 'paid' ? 'Payé' :
                         selectedOrder.payment.status === 'pending' ? 'En attente' :
                         selectedOrder.payment.status === 'partial' ? 'Partiel' :
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

            {/* ════════ NOTES ════════ */}
            {selectedOrder.notes && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Notes
                </h3>
                <div className="p-4 bg-card border border-border rounded-xl">
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              </div>
            )}

            {/* ════════ DATES ════════ */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Historique
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

            {/* ════════ MISE À JOUR DU STATUT ════════ */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-muted-foreground" /> 
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