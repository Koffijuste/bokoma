// app/(admin)/dashboard/coupons/page.tsx
'use client';

import React, { FormEvent, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus, Edit, Trash2, Loader2, Percent, DollarSign, Calendar,
  Tag, Search, Copy, Power, AlertTriangle, CheckCircle2, Ticket,
  Filter, RefreshCw, Hash, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// NB : on importe `NativeSelect` (HTML natif, API simple options/value/onChange).
// Le composant `Select` de @/components/ui/select est Radix — API incompatible
// avec des props plates.
import { NativeSelect } from '@/components/ui/forms/native-select';
const Select = NativeSelect;
import { Modal } from '@/components/ui/modal';
import { couponApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatDate, cn } from '@/utils/helpers';
import { toast } from 'sonner';

type DiscountType = 'percentage' | 'fixed';
type StatusFilter = 'all' | 'active' | 'inactive' | 'expiring' | 'expired';

interface Coupon {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchase?: number;
  maxUsage?: number;
  currentUsage: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

interface FormData {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  minPurchase: string;
  maxUsage: string;
  validFrom: string;
  validUntil: string;
  description: string;
  isActive: boolean;
}

const discountTypes = [
  { value: 'percentage', label: 'Pourcentage (%)', icon: Percent },
  { value: 'fixed', label: 'Montant fixe (FCFA)', icon: DollarSign },
] as const;

const ALERT_DAYS = 7; // seuil "expire bientôt" — badge warning
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
  { value: 'expiring', label: 'Expirent bientôt' },
  { value: 'expired', label: 'Expirés' },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers purs (testables, mémoïsables)
// ────────────────────────────────────────────────────────────────────────────

function daysUntil(date: string | Date): number {
  const target = new Date(date).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / MS_PER_DAY);
}

function getCouponState(coupon: Coupon): 'expired' | 'expiring' | 'active' | 'inactive' {
  if (!coupon.isActive) return 'inactive';
  const d = daysUntil(coupon.validUntil);
  if (d < 0) return 'expired';
  if (d <= ALERT_DAYS) return 'expiring';
  return 'active';
}

const STATE_STYLE: Record<ReturnType<typeof getCouponState>, { label: string; cls: string }> = {
  active:   { label: 'Actif',         cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  inactive: { label: 'Inactif',       cls: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  expiring: { label: 'Bientôt',       cls: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  expired:  { label: 'Expiré',        cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

function defaultFormData(): FormData {
  return {
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    maxUsage: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    description: '',
    isActive: true,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function CouponsAdminPage() {
  useRequireAdmin();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Nouveaux états UX ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>(defaultFormData());

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await couponApi.getCoupons();
      const data = response?.data?.coupons || response?.data || response;
      setCoupons(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error fetching coupons:', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  // ── Dérivés : stats, filtrage, groupement ────────────────────────────────

  const stats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, totalUsage = 0;
    for (const c of coupons) {
      const state = getCouponState(c);
      if (state === 'active') active++;
      else if (state === 'expiring') expiring++;
      else if (state === 'expired') expired++;
      totalUsage += c.currentUsage || 0;
    }
    return { total: coupons.length, active, expiring, expired, totalUsage };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return coupons.filter((c) => {
      const matchSearch =
        !q ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (statusFilter === 'all') return true;
      return getCouponState(c) === statusFilter;
    });
  }, [coupons, searchQuery, statusFilter]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData(defaultFormData());
    setFormErrors({});
    setError(null);
    setMessage(null);
    setEditingCoupon(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minPurchase: coupon.minPurchase?.toString() || '',
      maxUsage: coupon.maxUsage?.toString() || '',
      validFrom: (coupon.validFrom || '').split('T')[0],
      validUntil: (coupon.validUntil || '').split('T')[0],
      description: coupon.description || '',
      isActive: coupon.isActive,
    });
    setFormErrors({});
    setModalOpen(true);
  }, []);

  const openDuplicateModal = useCallback((coupon: Coupon) => {
    setEditingCoupon(null);
    setFormData({
      code: `${coupon.code}_COPIE`,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minPurchase: coupon.minPurchase?.toString() || '',
      maxUsage: coupon.maxUsage?.toString() || '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      description: coupon.description || '',
      isActive: false, // inactif par défaut : évite d'activer par accident un doublon
    });
    setFormErrors({});
    setModalOpen(true);
    toast.info(`Coupon dupliqué depuis ${coupon.code}`, {
      description: 'Modifie le code et la date de fin avant d\'enregistrer.',
    });
  }, []);

  // ── Validation + Submit ──────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const code = formData.code.trim();

    if (!code) errors.code = 'Le code est requis';
    else if (code.length < 3) errors.code = 'Minimum 3 caractères';
    else if (code.length > 20) errors.code = 'Maximum 20 caractères';
    else if (!/^[A-Z0-9_-]+$/i.test(code)) errors.code = 'Caractères autorisés : lettres, chiffres, _ et -';

    const discountValue = parseFloat(formData.discountValue);
    if (!formData.discountValue || !Number.isFinite(discountValue) || discountValue <= 0) {
      errors.discountValue = 'Valeur invalide';
    } else if (formData.discountType === 'percentage' && discountValue > 100) {
      errors.discountValue = 'Maximum 100%';
    }

    if (!formData.validUntil) {
      errors.validUntil = 'Date de fin requise';
    } else if (new Date(formData.validUntil).getTime() < Date.now() - MS_PER_DAY) {
      errors.validUntil = 'Date future requise';
    }
    if (formData.validFrom && formData.validUntil &&
        new Date(formData.validFrom) > new Date(formData.validUntil)) {
      errors.validUntil = 'Doit être postérieure à la date de début';
    }

    if (formData.minPurchase) {
      const v = parseFloat(formData.minPurchase);
      if (!Number.isFinite(v) || v < 0) errors.minPurchase = 'Valeur invalide';
    }
    if (formData.maxUsage) {
      const v = parseInt(formData.maxUsage, 10);
      if (!Number.isFinite(v) || v < 1) errors.maxUsage = 'Au moins 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setMessage(null);
    setError(null);
    setSaving(true);

    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage, 10) : undefined,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingCoupon) {
        await couponApi.updateCoupon(editingCoupon._id, payload);
        setMessage('✅ Coupon mis à jour avec succès');
        toast.success(`Coupon ${payload.code} mis à jour`);
      } else {
        await couponApi.createCoupon(payload);
        setMessage('✅ Coupon créé avec succès');
        toast.success(`Coupon ${payload.code} créé`);
      }

      setModalOpen(false);
      resetForm();
      await fetchCoupons();
    } catch (err: any) {
      console.error('❌ Error saving coupon:', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      // Erreurs de validation backend (422) — typiquement champs précis
      if (err?.response?.status === 422) {
        const errors = err?.response?.data?.errors;
        if (Array.isArray(errors)) {
          const fieldErrors: Record<string, string> = {};
          for (const e of errors) {
            if (e.field || e.path) fieldErrors[e.field || e.path] = e.message;
          }
          if (Object.keys(fieldErrors).length > 0) {
            setFormErrors((prev) => ({ ...prev, ...fieldErrors }));
          }
          setError(errors.map((e: any) => e.message).join(', '));
          return;
        }
      }

      if (err?.response?.status === 409) {
        setFormErrors((prev) => ({ ...prev, code: 'Ce code promo existe déjà' }));
        setError('Ce code promo existe déjà. Choisissez un autre code.');
        return;
      }

      if (err?.response?.status === 401) {
        setError('Session expirée. Reconnexion...');
        setTimeout(() => { window.location.href = '/auth/login'; }, 2000);
        return;
      }

      setError(
        err?.response?.data?.message ||
        err?.message ||
        (editingCoupon ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'),
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Actions rapides (sans ouvrir la modale) ──────────────────────────────

  const handleQuickToggle = async (coupon: Coupon) => {
    if (togglingId) return;
    try {
      setTogglingId(coupon._id);
      const next = !coupon.isActive;
      await couponApi.updateCoupon(coupon._id, { isActive: next });
      setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? { ...c, isActive: next } : c)));
      toast.success(`Coupon ${coupon.code} ${next ? 'activé' : 'désactivé'}`);
    } catch (err: any) {
      console.error('❌ Toggle error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors du changement de statut');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Supprimer définitivement le coupon "${code}" ?\n\nCette action est irréversible.`)) return;
    try {
      await couponApi.deleteCoupon(id);
      setMessage(`🗑️ Coupon "${code}" supprimé`);
      toast.success(`Coupon ${code} supprimé`);
      await fetchCoupons();
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      toast.error(err?.message || 'Erreur lors de la suppression');
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copié dans le presse-papier`);
  };

  // ── Form bindings ────────────────────────────────────────────────────────

  const handleInputChange = (field: keyof FormData) => (value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const getPreviewDiscount = () => {
    const value = parseFloat(formData.discountValue) || 0;
    if (formData.discountType === 'percentage') return `-${value}%`;
    return `-${value.toLocaleString('fr-FR')} FCFA`;
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Coupons & Promotions</h1>
            {stats.expiring > 0 && (
              <span className="px-3 py-1 bg-amber-500/15 text-amber-700 border border-amber-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {stats.expiring} expire{(stats.expiring > 1 ? 'nt' : '')} bientôt
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Créez et gérez vos codes promo pour la boutique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchCoupons} disabled={loading} className="gap-2">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Rafraîchir
          </Button>
          <Button size="lg" variant="primary" onClick={openCreateModal} className="gap-2 shadow-lg shadow-accent/20">
            <Plus className="w-4 h-4" />
            Nouveau coupon
          </Button>
        </div>
      </div>

      {/* ── MESSAGES ──────────────────────────────────────────────────────── */}
      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ── STATS CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Ticket}        label="Total"             value={stats.total}      gradient="from-blue-500/10 to-blue-500/5"     border="border-blue-500/20"     color="text-blue-600" />
        <StatCard icon={CheckCircle2}  label="Actifs"            value={stats.active}     gradient="from-emerald-500/10 to-emerald-500/5" border="border-emerald-500/20" color="text-emerald-600" />
        <StatCard icon={AlertTriangle} label="Expirent bientôt"  value={stats.expiring}   gradient="from-amber-500/10 to-amber-500/5"   border="border-amber-500/20"   color="text-amber-600" />
        <StatCard icon={Hash}          label="Utilisations"      value={stats.totalUsage} gradient="from-accent/10 to-accent/5"         border="border-accent/20"      color="text-accent" />
      </div>

      {/* ── FILTRES ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par code ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
        />
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Réduction</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conditions</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utilisation</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validité</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <span className="text-sm">Chargement des coupons...</span>
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Tag className="w-12 h-12 opacity-30" />
                      <p className="text-sm font-medium">Aucun coupon créé pour le moment</p>
                      <p className="text-xs text-muted-foreground/70 max-w-sm">
                        Créez votre premier code promotionnel pour offrir des réductions à vos clients.
                      </p>
                      <Button variant="primary" size="sm" onClick={openCreateModal} className="mt-2 gap-2">
                        <Plus className="w-4 h-4" />
                        Créer mon premier coupon
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Filter className="w-8 h-8 opacity-40" />
                      <p className="text-sm">Aucun coupon ne correspond à ces filtres.</p>
                      <button
                        className="text-xs text-accent hover:underline"
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon, index) => {
                  const state = getCouponState(coupon);
                  const stateStyle = STATE_STYLE[state];
                  const days = daysUntil(coupon.validUntil);
                  const usagePct = coupon.maxUsage ? Math.min(100, (coupon.currentUsage / coupon.maxUsage) * 100) : 0;
                  const isToggling = togglingId === coupon._id;

                  return (
                    <tr
                      key={coupon._id}
                      className="hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-left-2 duration-300"
                      style={{ animationDelay: `${index * 25}ms` }}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="group inline-flex items-center gap-2 font-mono font-semibold text-sm hover:text-accent transition-colors"
                          title="Copier le code"
                        >
                          <Tag className="w-4 h-4 text-accent" />
                          {coupon.code}
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-xs">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {coupon.discountType === 'percentage' ? (
                            <Percent className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-bold text-sm">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}%`
                              : `${coupon.discountValue.toLocaleString('fr-FR')} FCFA`}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {coupon.minPurchase ? (
                          <div>Min <span className="font-semibold text-foreground">{coupon.minPurchase.toLocaleString('fr-FR')} FCFA</span></div>
                        ) : <span className="italic">Aucun minimum</span>}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                            <div
                              className={cn(
                                'h-full transition-all',
                                usagePct >= 90 ? 'bg-red-500' :
                                usagePct >= 70 ? 'bg-amber-500' :
                                'bg-accent',
                              )}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {coupon.currentUsage} / {coupon.maxUsage || '∞'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <div>{formatDate(coupon.validUntil)}</div>
                        {state === 'expiring' && (
                          <p className="text-[11px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expire dans {days} jour{days > 1 ? 's' : ''}
                          </p>
                        )}
                        {state === 'expired' && (
                          <p className="text-[11px] text-red-600 font-semibold mt-0.5">Expiré</p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                          stateStyle.cls,
                        )}>
                          {stateStyle.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle rapide */}
                          <button
                            onClick={() => handleQuickToggle(coupon)}
                            disabled={isToggling || state === 'expired'}
                            title={coupon.isActive ? 'Désactiver' : 'Activer'}
                            className={cn(
                              'h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                              coupon.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30'
                                : 'bg-muted text-muted-foreground hover:bg-muted/70 border border-border',
                            )}
                          >
                            {isToggling
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Power className="w-4 h-4" />}
                          </button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-accent hover:text-accent/80"
                            onClick={() => openEditModal(coupon)}
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-blue-600 hover:text-blue-700"
                            onClick={() => openDuplicateModal(coupon)}
                            title="Dupliquer"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive/80"
                            onClick={() => handleDelete(coupon._id, coupon.code)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ── MOBILE CARDS ──────────────────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Tag className="w-12 h-12 opacity-30" />
            <p className="text-sm">Aucun coupon</p>
            <Button variant="primary" size="sm" onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" /> Créer un coupon
            </Button>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Filter className="w-8 h-8 opacity-40" />
            <p className="text-sm">Aucun résultat.</p>
            <button
              className="text-xs text-accent hover:underline"
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          filteredCoupons.map((coupon) => {
            const state = getCouponState(coupon);
            const stateStyle = STATE_STYLE[state];
            const days = daysUntil(coupon.validUntil);
            const isToggling = togglingId === coupon._id;

            return (
              <div
                key={coupon._id}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => handleCopyCode(coupon.code)}
                    className="font-mono font-bold text-base hover:text-accent transition-colors"
                  >
                    {coupon.code}
                  </button>
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                    stateStyle.cls,
                  )}>
                    {stateStyle.label}
                  </span>
                </div>
                {coupon.description && (
                  <p className="text-xs text-muted-foreground">{coupon.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold text-accent">
                    {coupon.discountType === 'percentage'
                      ? `-${coupon.discountValue}%`
                      : `-${coupon.discountValue.toLocaleString('fr-FR')} FCFA`}
                  </span>
                  {coupon.minPurchase ? (
                    <span className="text-xs text-muted-foreground">
                      · Min {coupon.minPurchase.toLocaleString('fr-FR')} FCFA
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(coupon.validUntil)}
                  </div>
                  <div>
                    {coupon.currentUsage} / {coupon.maxUsage || '∞'} utilisations
                  </div>
                </div>
                {state === 'expiring' && (
                  <p className="text-xs text-amber-600 font-semibold">
                    ⚠️ Expire dans {days} jour{days > 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleQuickToggle(coupon)}
                    disabled={isToggling || state === 'expired'}
                    className={cn(
                      'h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40',
                      coupon.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(coupon)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openDuplicateModal(coupon)}>
                    <Copy className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon._id, coupon.code)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODALE FORM ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingCoupon ? 'Modifier le coupon' : 'Créer un coupon'}
        description={editingCoupon
          ? `Modifiez les informations de ${editingCoupon.code}.`
          : 'Remplissez les informations pour créer un nouveau code promotionnel.'}
        size="lg"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => { setModalOpen(false); resetForm(); }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              form="coupon-form"
              isLoading={saving}
              disabled={saving}
            >
              {saving
                ? 'Enregistrement...'
                : editingCoupon
                  ? 'Mettre à jour'
                  : 'Créer le coupon'}
            </Button>
          </>
        }
      >
        <form id="coupon-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
          {/* Code + Description */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Code du coupon
            </h3>

            <div className="space-y-2">
              <Input
                label="Code *"
                placeholder="Ex : PROMO2024"
                value={formData.code}
                onChange={(e) => handleInputChange('code')(e.target.value.toUpperCase())}
                error={formErrors.code}
                maxLength={20}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Lettres, chiffres, tirets et underscores. Sera converti en majuscules.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description')(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Description interne (optionnelle)..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/200
              </p>
            </div>
          </div>

          {/* Réduction */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Réduction
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type de réduction *</label>
                <Select
                  options={discountTypes.map((t) => ({ value: t.value, label: t.label }))}
                  value={formData.discountType}
                  onChange={(e) => handleInputChange('discountType')(e.target.value as DiscountType)}
                />
              </div>

              <div className="space-y-2">
                <Input
                  label={`Valeur ${formData.discountType === 'percentage' ? '(%)' : '(FCFA)'} *`}
                  type="number"
                  min="0"
                  max={formData.discountType === 'percentage' ? '100' : undefined}
                  step={formData.discountType === 'percentage' ? '0.1' : '1'}
                  placeholder={formData.discountType === 'percentage' ? '10' : '5000'}
                  value={formData.discountValue}
                  onChange={(e) => handleInputChange('discountValue')(e.target.value)}
                  error={formErrors.discountValue}
                />
              </div>
            </div>

            {formData.discountValue && !formErrors.discountValue && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-xs text-muted-foreground mb-1">Aperçu :</p>
                <p className="text-2xl font-bold text-accent">{getPreviewDiscount()}</p>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Conditions d'utilisation
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Input
                  label="Achat minimum (FCFA)"
                  type="number"
                  min="0"
                  placeholder="0 = aucune condition"
                  value={formData.minPurchase}
                  onChange={(e) => handleInputChange('minPurchase')(e.target.value)}
                  error={formErrors.minPurchase}
                />
              </div>
              <div className="space-y-2">
                <Input
                  label="Utilisations max"
                  type="number"
                  min="1"
                  placeholder="Vide = illimité"
                  value={formData.maxUsage}
                  onChange={(e) => handleInputChange('maxUsage')(e.target.value)}
                  error={formErrors.maxUsage}
                />
              </div>
            </div>
          </div>

          {/* Validité */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Période de validité
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Input
                  label="Date de début"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => handleInputChange('validFrom')(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Input
                  label="Date de fin *"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => handleInputChange('validUntil')(e.target.value)}
                  error={formErrors.validUntil}
                />
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Statut
            </h3>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Coupon actif</span>
              <button
                type="button"
                onClick={() => handleInputChange('isActive')(!formData.isActive)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.isActive ? 'bg-accent' : 'bg-muted',
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  formData.isActive ? 'translate-x-6' : 'translate-x-1',
                )} />
              </button>
              <span className="text-xs text-muted-foreground">
                {formData.isActive ? 'Visible et utilisable en boutique' : 'Masqué — ne peut pas être saisi'}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomposant : StatCard
// ────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  border,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  gradient: string;
  border: string;
  color: string;
}) {
  return (
    <div className={cn(
      'p-4 bg-gradient-to-br border rounded-xl hover:shadow-md transition-shadow',
      gradient, border,
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center',
          color,
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
