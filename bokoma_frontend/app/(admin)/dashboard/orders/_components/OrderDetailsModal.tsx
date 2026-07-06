// app/(admin)/dashboard/orders/_components/OrderDetailsModal.tsx
// ============================================================================
// 👁️ ORDER DETAILS MODAL — Vue "VOIR" optimisée pour /dashboard/orders
// ============================================================================
// Objectifs :
//   - Pointures / Tailles TOUJOURS visibles (jamais dans un panneau caché).
//   - Détection fiable du type (footwear / clothing / other) avec fallbacks
//     sur product.type, category.slug, name et — dernier recours — la forme
//     de la valeur de taille.
//   - Layout en grille responsive, scan visuel rapide, scan de l'ordre
//     vertical : header → articles → client → livraison → paiement → statut.
//   - Sans dépendance aux helpers textuels du composant parent.
// ============================================================================

'use client';

import React, { useMemo } from 'react';
import {
  Loader2,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  ShoppingBag,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Calendar,
  Hash,
  Copy,
  ExternalLink,
  Trash2,
  Shirt,
  Footprints,
  Ruler,
  Palette,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate, cn } from '@/utils/helpers';
import { toast } from 'sonner';
import type { Order, OrderStatus } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
//  STATUTS — version locale (alignée avec statusOptions de la page parente)
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{
  value: OrderStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  desc: string;
}> = [
  { value: 'pending',    label: 'En attente',  icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   desc: 'Le client n\'a pas encore payé' },
  { value: 'confirmed',  label: 'Confirmée',   icon: CheckCircle, color: 'text-blue-600',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    desc: 'Paiement reçu et validé' },
  { value: 'processing', label: 'En préparation', icon: Package,  color: 'text-purple-600',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  desc: 'Préparation en cours' },
  { value: 'shipped',    label: 'Expédiée',    icon: Truck,       color: 'text-cyan-600',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    desc: 'En cours de livraison' },
  { value: 'delivered',  label: 'Livrée',      icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Livraison effectuée' },
  { value: 'cancelled',  label: 'Annulée',     icon: AlertCircle, color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     desc: 'Commande annulée' },
  { value: 'refunded',   label: 'Remboursée',  icon: AlertCircle, color: 'text-slate-600',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   desc: 'Remboursement effectué' },
];

const getStatusConfig = (status: OrderStatus | string) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '💳 Carte bancaire',
  mobile_money: '📱 Mobile Money',
  cash_on_delivery: '🏠 Paiement à la livraison',
  bank_transfer: '🏦 Virement bancaire',
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid:      { label: '✅ Payé',        cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  completed: { label: '✅ Payé',        cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  partial:   { label: '💰 Paiement partiel', cls: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  pending:   { label: '⏳ En attente',  cls: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  failed:    { label: '❌ Échoué',      cls: 'bg-red-500/10 text-red-700 border-red-500/30' },
  expired:   { label: '⌛ Expiré',      cls: 'bg-slate-500/10 text-slate-700 border-slate-500/30' },
  cancelled: { label: '🚫 Annulé',      cls: 'bg-slate-500/10 text-slate-700 border-slate-500/30' },
  refunded:  { label: '↩️ Remboursé',   cls: 'bg-slate-500/10 text-slate-700 border-slate-500/30' },
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACTION ROBUSTE DE LA TAILLE
//  On accepte plusieurs formats de champs côté backend/front, et on ne perd
//  jamais la donnée : si la "size" est vide, on tente variant, options, etc.
// ─────────────────────────────────────────────────────────────────────────────

const CLOTHING_SIZES = /^(xs|s|m|l|xl|xxl|xxxl|tu|unique|std|one\s?size)$/i;
const FOOTWEAR_RANGE = { min: 20, max: 50 };

function pickFirstDefined(...values: unknown[]): string | null {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== '') return s;
  }
  return null;
}

function extractSize(item: any): string | null {
  if (!item) return null;
  const product = item.product && typeof item.product === 'object' ? item.product : {};
  const variant = item.variant && typeof item.variant === 'object' ? item.variant : {};

  return pickFirstDefined(
    item.size,
    item.selectedSize,
    item.options?.size,
    item.attributes?.size,
    item.variantSize,
    variant.size,
    product.variants?.find((v: any) => v._id === item.variant || v.sku === item.sku)?.size,
  );
}

function parseFirstNumber(value: string): number | null {
  if (!value) return null;
  const m = String(value).match(/\d{1,3}(?:[.,]\d+)?/);
  if (!m) return null;
  const num = parseFloat(m[0].replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

type SizeKind = 'footwear' | 'clothing' | 'other';

function detectSizeKind(item: any, size: string | null): SizeKind {
  if (!item) return 'other';
  const product = item.product && typeof item.product === 'object' ? item.product : {};
  const raw = (size || '').trim();

  // 1. Champ product.type explicite (priorité la plus haute)
  const productType = (typeof product.type === 'string' ? product.type : '').toLowerCase();
  if (productType === 'shoes' || productType === 'chaussures') return 'footwear';
  if (productType === 'clothing' || productType === 'vetements' || productType === 'vêtements') return 'clothing';

  // 2. Format littéral de la taille
  if (raw) {
    if (CLOTHING_SIZES.test(raw)) return 'clothing';
    const num = parseFirstNumber(raw);
    if (num !== null && num >= FOOTWEAR_RANGE.min && num <= FOOTWEAR_RANGE.max) {
      return 'footwear';
    }
  }

  // 3. Catégorie populée
  const cat = product.category;
  const catSlug = (
    typeof cat === 'string'
      ? cat
      : cat?.slug || cat?.name || ''
  ).toLowerCase();
  if (catSlug) {
    if (catSlug.includes('chauss') || catSlug.includes('sandale') || catSlug.includes('basket') || catSlug.includes('shoe') || catSlug.includes('footwear')) {
      return 'footwear';
    }
    if (catSlug.includes('vêt') || catSlug.includes('vet') || catSlug.includes('clothing') || catSlug.includes('habit')) {
      return 'clothing';
    }
  }

  // 4. Nom du produit (en dernier recours)
  const name = (product.name || item.name || '').toLowerCase();
  if (/(sandal|chaussure|basket|shoe|timberland|air force|jordan)/.test(name)) return 'footwear';
  if (/(pull|t-shirt|chemise|robe|pantalon|veste|short|hoodie|polo)/.test(name)) return 'clothing';

  return 'other';
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT : SizeBadge — l'élément visuel clé de la VOIR
//  Toujours rendu, dimension généreuse, accessible.
// ─────────────────────────────────────────────────────────────────────────────

function SizeBadge({ size, kind }: { size: string; kind: SizeKind }) {
  if (kind === 'footwear') {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-purple-500/10 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
          <Footprints className="w-5 h-5 text-accent" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-accent/80 font-bold">
            Pointure
          </span>
          <span className="text-2xl font-extrabold text-accent leading-none">
            {size}
          </span>
        </div>
      </div>
    );
  }

  if (kind === 'clothing') {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
          <Shirt className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-blue-600/80 font-bold">
            Taille
          </span>
          <span className="text-2xl font-extrabold text-blue-600 leading-none">
            {size}
          </span>
        </div>
      </div>
    );
  }

  // fallback "other" — la taille reste visible
  return (
    <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-500/40 bg-gradient-to-br from-slate-500/10 to-slate-400/5 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
        <Ruler className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-slate-600/80 font-bold">
          Option
        </span>
        <span className="text-2xl font-extrabold text-slate-700 leading-none">
          {size}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT : SizeMissingHint — message contextuel quand la taille manque
//
//  3 cas distincts pour ne plus jamais afficher "Aucune taille sélectionnée"
//  sans contexte :
//    1. Article sans taille requise (parfum, accessoire) → ligne discrète
//    2. Article qui exige une taille (vêtement, chaussure) mais non enregistrée
//       → avertissement explicite (probablement un bug de l'achat)
//    3. Type inconnu → message générique
// ─────────────────────────────────────────────────────────────────────────────

function SizeMissingHint({
  product,
}: {
  product: { type?: string; category?: any; name?: string };
}) {
  const t = String(product?.type || '').toLowerCase();
  const catName = (
    typeof product?.category === 'object'
      ? product.category?.name || product.category?.slug
      : product?.category || ''
  ).toString().toLowerCase();

  const noSizeType = ['perfume', 'accessory', 'accessoire', 'parfum'].includes(t);
  const requiresSize =
    t === 'shoes' || t === 'chaussures' ||
    t === 'clothing' || t === 'vetements' || t === 'vêtements' ||
    catName.includes('chauss') || catName.includes('sandal') ||
    catName.includes('basket') || catName.includes('shoe') ||
    catName.includes('vêt') || catName.includes('vet') ||
    catName.includes('habit') || catName.includes('clothing');

  if (noSizeType) {
    return (
      <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
        <Ruler className="w-3 h-3" />
        Cet article ne nécessite pas de taille.
      </p>
    );
  }

  if (requiresSize) {
    return (
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700">
          <p className="font-semibold mb-0.5">Taille non enregistrée</p>
          <p className="text-amber-700/80">
            Le client aurait dû choisir une taille lors de l'achat. Vérifie le panier et la commande pour comprendre.
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
      <Ruler className="w-3 h-3" />
      Aucune taille renseignée pour cet article.
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT : CartItemRow — carte article compacte (tailles visibles)
// ─────────────────────────────────────────────────────────────────────────────

function CartItemRow({ item, index }: { item: any; index: number }) {
  const size = extractSize(item);
  const kind = size ? detectSizeKind(item, size) : 'other';

  const product = item.product && typeof item.product === 'object' ? item.product : {};
  const name = product.name || item.name || 'Produit';
  const slug = product.slug as string | undefined;
  const imageUrl: string | null =
    (Array.isArray(product.images) && product.images[0]
      ? typeof product.images[0] === 'string'
        ? product.images[0]
        : product.images[0]?.url
      : null) ??
    item.image ??
    null;

  const unitPrice = item.price || 0;
  const quantity = item.quantity || 1;
  const subtotal = unitPrice * quantity;
  const color = pickFirstDefined(item.color, product.attributes?.find?.((a: any) => a.key?.toLowerCase() === 'color')?.value);
  const sku = item.sku;

  return (
    <div
      className="rounded-2xl border border-border bg-card hover:border-accent/40 transition-colors overflow-hidden"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Image produit */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 ring-1 ring-border/50 flex-shrink-0 mx-auto sm:mx-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
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

        {/* Contenu principal : nom + badges taille/couleur */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base line-clamp-2">{name}</p>
              {slug && (
                <a
                  href={`/products/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-0.5"
                >
                  Voir le produit <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <span className="text-base font-bold text-accent whitespace-nowrap">
              {formatPrice(subtotal)}
            </span>
          </div>

          {/* Grille des attributs produit — Taille TOUJOURS prominente */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-xs font-medium">
              <Hash className="w-3 h-3" /> Qté {quantity}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-xs font-medium">
              {formatPrice(unitPrice)} / unité
            </span>
            {color && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 border border-purple-500/30 text-xs font-medium">
                <Palette className="w-3 h-3" /> {color}
              </span>
            )}
            {sku && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-700 border border-slate-500/30 text-xs font-mono">
                SKU {sku}
              </span>
            )}
          </div>

          {/* 🔑 TAILLE — affichage contextuel selon la disponibilité + type produit */}
          {size ? (
            <div className="pt-1">
              <SizeBadge size={size} kind={kind} />
              {String(size).includes('-') && (
                <p className="mt-2 text-[11px] text-muted-foreground italic">
                  Plage de tailles : {size}
                </p>
              )}
            </div>
          ) : (
            <div className="pt-1">
              <SizeMissingHint product={product} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT : MiniInfoRow — info compacte avec icône (utilisé dans les
//  sections client / livraison / paiement).
// ─────────────────────────────────────────────────────────────────────────────

function MiniInfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
  copyable = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
}) {
  const handleCopy = () => {
    if (copyable && typeof value === 'string') {
      navigator.clipboard.writeText(value);
      toast.success('Copié dans le presse-papier');
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium break-words', mono && 'font-mono text-xs')}>
            {value || '—'}
          </p>
          {copyable && typeof value === 'string' && value && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Copier"
            >
              <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL : OrderDetailsModal
// ─────────────────────────────────────────────────────────────────────────────

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdateStatus?: (id: string, status: string) => void;
  onDelete?: (order: Order) => void;
  updatingStatus?: boolean;
  deleting?: boolean;
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  onUpdateStatus,
  onDelete,
  updatingStatus = false,
  deleting = false,
}: OrderDetailsModalProps) {
  // Helpers dérivés mémoïsés
  const derived = useMemo(() => {
    if (!order) return null;
    const status = getStatusConfig(order.status);
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    return { status, items, subtotal };
  }, [order]);

  const copyId = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  if (!order || !derived) return null;

  const { status, items, subtotal } = derived;
  const StatusIcon = status.icon;
  const paymentStatus = PAYMENT_STATUS_LABEL[order.payment?.status] ?? {
    label: order.payment?.status || '—',
    cls: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={null}
      description={null}
    >
      <div className="space-y-6">
        {/* ── HEADER COMPACT ────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-start justify-between gap-3 p-4 bg-gradient-to-br from-muted/40 via-muted/20 to-transparent rounded-2xl border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
                status.bg, status.color, status.border
              )}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/80 border border-border text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDate(order.createdAt)}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Commande <span className="font-mono">#{order.orderNumber || order._id?.slice(-6)}</span>
            </h2>
            <button
              onClick={() => copyId(order._id, 'ID commande')}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Hash className="w-3 h-3" />
              {order._id?.slice(-14)}
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              {formatPrice(order.total)}
            </p>
          </div>
        </header>

        {/* ── ARTICLES — section hero, tailles en avant ─────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
              </span>
              Articles ({items.length})
            </h3>
            <span className="text-[11px] text-muted-foreground italic">
              Pointures / tailles affichées pour chaque article
            </span>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun article dans cette commande</p>
              </div>
            ) : (
              items.map((it, idx) => (
                <CartItemRow key={(it as any)._id || idx} item={it} index={idx} />
              ))
            )}
          </div>
        </section>

        {/* ── CLIENT + LIVRAISON — grille 2 colonnes ───────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Client
              </h3>
            </div>
            <MiniInfoRow
              icon={User}
              label="Nom"
              value={
                (order.user as any)?.firstName
                  ? `${(order.user as any).firstName} ${(order.user as any).lastName || ''}`.trim()
                  : (order.user as any)?.name || order.shipping?.fullName || '—'
              }
            />
            <MiniInfoRow
              icon={Mail}
              label="Email"
              value={(order.user as any)?.email}
              copyable
            />
            <MiniInfoRow
              icon={Phone}
              label="Téléphone"
              value={order.shipping?.phone || (order.user as any)?.phone}
              copyable
            />
            {(order.user as any)?._id && (
              <MiniInfoRow
                icon={Hash}
                label="ID utilisateur"
                value={(order.user as any)._id}
                mono
                copyable
              />
            )}
          </div>

          {/* Livraison */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Livraison
              </h3>
            </div>
            {order.shipping ? (
              <>
                <MiniInfoRow icon={User} label="Destinataire" value={order.shipping.fullName} />
                <MiniInfoRow
                  icon={MapPin}
                  label="Adresse"
                  value={[
                    order.shipping.street,
                    order.shipping.city,
                    order.shipping.postalCode,
                    order.shipping.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                />
                <MiniInfoRow
                  icon={Phone}
                  label="Téléphone"
                  value={order.shipping.phone}
                  copyable
                />
                {order.shipping.trackingNumber && (
                  <MiniInfoRow
                    icon={Truck}
                    label="N° de suivi"
                    value={order.shipping.trackingNumber}
                    mono
                    copyable
                  />
                )}
                {typeof order.shipping.cost === 'number' && (
                  <MiniInfoRow
                    icon={Truck}
                    label="Frais"
                    value={
                      order.shipping.cost > 0 ? formatPrice(order.shipping.cost) : 'Gratuit'
                    }
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Pas d'adresse de livraison renseignée.
              </p>
            )}
          </div>
        </section>

        {/* ── PAIEMENT — bloc compact ───────────────────────────────────── */}
        {order.payment && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-accent" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Paiement
              </h3>
              <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ml-auto',
                paymentStatus.cls
              )}>
                {paymentStatus.label}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Méthode
                </p>
                <p className="text-sm font-semibold mt-1">
                  {PAYMENT_METHOD_LABEL[order.payment.method] || order.payment.method}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sous-total
                </p>
                <p className="text-sm font-semibold mt-1">{formatPrice(subtotal)}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Livraison
                </p>
                <p className="text-sm font-semibold mt-1">
                  {order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Gratuit'}
                </p>
              </div>
              {order.discount > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700">
                    Remise
                  </p>
                  <p className="text-sm font-semibold text-emerald-700 mt-1">
                    -{formatPrice(order.discount)}
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-accent">
                  Total
                </p>
                <p className="text-base font-bold text-accent mt-1">
                  {formatPrice(order.total)}
                </p>
              </div>
              {typeof order.payment.amountPaid === 'number' && (
                <div className="rounded-xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Montant payé
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {formatPrice(order.payment.amountPaid)}
                  </p>
                </div>
              )}
              {order.payment.transactionId && (
                <div className="rounded-xl border border-border bg-background/50 p-3 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    ID Transaction
                  </p>
                  <p className="text-xs font-mono mt-1 break-all">
                    {order.payment.transactionId}
                  </p>
                </div>
              )}
            </div>

            {order.payment.rejectionReason && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/30">
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Motif de rejet
                </p>
                <p className="text-xs text-red-700/80">{order.payment.rejectionReason}</p>
              </div>
            )}
          </section>
        )}

        {/* ── NOTES (optionnel) ─────────────────────────────────────────── */}
        {order.notes && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-700" />
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700">
                Notes
              </h3>
            </div>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </section>
        )}

        {/* ── STATUT — sélecteur rapide ───────────────────────────────── */}
        {onUpdateStatus && (
          <section className="rounded-2xl border-2 border-dashed border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </span>
                Mettre à jour le statut
              </h3>
              {updatingStatus && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs font-semibold text-accent">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Mise à jour...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isCurrent = opt.value === order.status;
                return (
                  <button
                    key={opt.value}
                    onClick={() => !isCurrent && onUpdateStatus(order._id, opt.value)}
                    disabled={updatingStatus || isCurrent}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center',
                      isCurrent
                        ? cn(opt.bg, opt.border, 'ring-2 ring-offset-2', opt.border.replace('border-', 'ring-'))
                        : 'border-border hover:border-accent/40 hover:bg-muted/30',
                      updatingStatus && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isCurrent ? opt.color : 'text-muted-foreground')} />
                    <span className={cn(
                      'text-[11px] font-semibold leading-tight',
                      isCurrent ? opt.color : 'text-muted-foreground',
                    )}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── DANGER ZONE ─────────────────────────────────────────────── */}
        {onDelete && (
          <section className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-destructive">
                    Zone dangereuse
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Supprimer définitivement la commande et restaurer le stock.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(order)}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
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
          </section>
        )}
      </div>
    </Modal>
  );
}
