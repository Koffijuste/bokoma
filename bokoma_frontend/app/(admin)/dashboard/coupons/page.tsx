// app/(admin)/dashboard/coupons/page.tsx
'use client';

import React, { FormEvent, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, Loader2, Percent, DollarSign, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { couponApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatDate } from '@/utils/helpers';

// Types pour les coupons
interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
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
  discountType: 'percentage' | 'fixed';
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

const statusOptions = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
];

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

  const [formData, setFormData] = useState<FormData>({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    maxUsage: '',
    validFrom: '',
    validUntil: '',
    description: '',
    isActive: true,
  });

  // 🔁 Chargement initial des coupons
  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await couponApi.getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error fetching coupons:', err);
      setError(err.message || 'Erreur lors du chargement des coupons');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // 🔄 Reset du formulaire
  const resetForm = useCallback(() => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minPurchase: '',
      maxUsage: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      description: '',
      isActive: true,
    });
    setFormErrors({});
    setError(null);
    setMessage(null);
    setEditingCoupon(null);
  }, []);

  // 🎯 Ouvrir le modal pour créer ou éditer
  const openModal = useCallback((coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        minPurchase: coupon.minPurchase?.toString() || '',
        maxUsage: coupon.maxUsage?.toString() || '',
        validFrom: coupon.validFrom.split('T')[0],
        validUntil: coupon.validUntil.split('T')[0],
        description: coupon.description || '',
        isActive: coupon.isActive,
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  }, [resetForm]);

  // ✅ Validation du formulaire
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const now = new Date();

    if (!formData.code.trim()) {
      errors.code = 'Le code est requis';
    } else if (formData.code.length < 3) {
      errors.code = 'Minimum 3 caractères';
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      errors.discountValue = 'Valeur invalide';
    } else if (formData.discountType === 'percentage' && parseFloat(formData.discountValue) > 100) {
      errors.discountValue = 'Maximum 100%';
    }

    if (!formData.validUntil) {
      errors.validUntil = 'Date de fin requise';
    } else if (new Date(formData.validUntil) < now) {
      errors.validUntil = 'Date future requise';
    }

    if (formData.minPurchase && parseFloat(formData.minPurchase) < 0) {
      errors.minPurchase = 'Valeur invalide';
    }

    if (formData.maxUsage && parseInt(formData.maxUsage) < 0) {
      errors.maxUsage = 'Valeur invalide';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 📤 Soumission du formulaire
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
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : undefined,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingCoupon) {
        await couponApi.updateCoupon(editingCoupon._id, payload);
        setMessage('✅ Coupon mis à jour avec succès');
      } else {
        await couponApi.createCoupon(payload);
        setMessage('✅ Coupon créé avec succès');
      }

      setModalOpen(false);
      resetForm();
      fetchCoupons();

    } catch (err: any) {
      console.error('❌ Error saving coupon:', err);
      setError(
        err?.response?.data?.message || 
        err?.message || 
        (editingCoupon ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création')
      );
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ Suppression d'un coupon
  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le coupon "${code}" ?`)) return;
    
    try {
      await couponApi.deleteCoupon(id);
      setMessage(`🗑️ Coupon "${code}" supprimé`);
      fetchCoupons();
    } catch (err: any) {
      console.error('❌ Error deleting coupon:', err);
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  // 🔄 Handlers pour les inputs
  const handleInputChange = (field: keyof FormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 🎨 Calcul de la prévisualisation
  const getPreviewDiscount = () => {
    const value = parseFloat(formData.discountValue) || 0;
    if (formData.discountType === 'percentage') {
      return `-${value}%`;
    }
    return `-${value.toLocaleString('fr-FR')} FCFA`;
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
          <h1 className="text-3xl font-bold mb-2">Gestion des Coupons</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos codes promotionnels
          </p>
        </div>
        <Button 
          size="lg" 
          variant="primary" 
          onClick={() => openModal()}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau Coupon
        </Button>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {message}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table des coupons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Valeur</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Utilisation</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Valide jusqu'au</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement des coupons...</span>
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Tag className="w-12 h-12 opacity-50" />
                      <p>Aucun coupon trouvé</p>
                      <Button variant="outline" size="sm" onClick={() => openModal()}>
                        Créer un coupon
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr
                    key={coupon._id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-accent" />
                        <span className="font-mono font-semibold">{coupon.code}</span>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        {coupon.discountType === 'percentage' ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                        {coupon.discountType === 'percentage' ? 'Pourcentage' : 'Fixe'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}%` 
                        : `${coupon.discountValue.toLocaleString('fr-FR')} FCFA`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ 
                              width: `${coupon.maxUsage ? (coupon.currentUsage / coupon.maxUsage) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {coupon.currentUsage} / {coupon.maxUsage || '∞'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatDate(coupon.validUntil)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        coupon.isActive
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {coupon.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-accent hover:text-accent/80"
                          onClick={() => openModal(coupon)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-destructive hover:text-destructive/80"
                          onClick={() => handleDelete(coupon._id, coupon.code)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal de création/édition */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingCoupon ? 'Modifier le coupon' : 'Créer un coupon'}
        description={editingCoupon 
          ? 'Modifiez les informations du coupon ci-dessous.'
          : 'Remplissez les informations pour créer un nouveau code promotionnel.'
        }
        size="lg"
        actions={
          <>
            <Button 
              variant="secondary" 
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
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
              {saving ? 'Enregistrement...' : editingCoupon ? 'Mettre à jour' : 'Créer le coupon'}
            </Button>
          </>
        }
      >
        <form id="coupon-form" className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Section: Code du coupon */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Code du coupon
            </h3>
            
            <div className="space-y-2">
              <Input
                label="Code *"
                placeholder="Ex: PROMO2024"
                value={formData.code}
                onChange={(e) => handleInputChange('code')(e.target.value.toUpperCase())}
                error={formErrors.code}
                required
                maxLength={20}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Le code sera automatiquement converti en majuscules
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description')(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition resize-none"
                placeholder="Description optionnelle du coupon..."
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/200
              </p>
            </div>
          </div>

          {/* Section: Type et valeur de réduction */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Réduction
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type de réduction *</label>
                <Select
                  options={discountTypes}
                  value={formData.discountType}
                  onChange={(value) => handleInputChange('discountType')(value as 'percentage' | 'fixed')}
                  renderOption={(option) => (
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="w-4 h-4" />}
                      <span>{option.label}</span>
                    </div>
                  )}
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
                  required
                />
              </div>
            </div>

            {/* Prévisualisation */}
            {formData.discountValue && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-sm text-muted-foreground mb-1">Aperçu de la réduction :</p>
                <p className="text-2xl font-bold text-accent">{getPreviewDiscount()}</p>
              </div>
            )}
          </div>

          {/* Section: Conditions */}
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

          {/* Section: Dates de validité */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Période de validité
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Input
                  label="Date de début *"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => handleInputChange('validFrom')(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Input
                  label="Date de fin *"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => handleInputChange('validUntil')(e.target.value)}
                  error={formErrors.validUntil}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: Statut */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Statut
            </h3>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Coupon actif</span>
              <button
                type="button"
                onClick={() => handleInputChange('isActive')(!formData.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isActive ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className="text-sm text-muted-foreground">
                {formData.isActive ? 'Visible et utilisable' : 'Masqué et inutilisable'}
              </span>
            </div>
          </div>

          {/* Error global */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}