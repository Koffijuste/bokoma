// app/(admin)/dashboard/products/page.tsx
'use client';

import React, { FormEvent, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, 
  Upload, CheckCircle, Zap, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/services/api';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/helpers';
import imageCompression from 'browser-image-compression';
import type { Category, Product } from '@/types';

// ============================================================================
// 🔹 CONSTANTS
// ============================================================================

const PRODUCT_TYPES = [
  { value: 'shoes', label: 'Chaussures' },
  { value: 'perfume', label: 'Parfum' },
  { value: 'clothing', label: 'Vêtements' },
  { value: 'accessory', label: 'Accessoire' },
] as const;

type ProductType = typeof PRODUCT_TYPES[number]['value'];

interface FormData {
  name: string;
  description: string;
  basePrice: string;
  category: string;
  type: ProductType;
  brand: string;
  totalStock: string;
}

interface CompressedImage {
  file: File;
  preview: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// ✅ Configuration de compression
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,           // Max 1MB après compression
  maxWidthOrHeight: 1920, // Max 1920px de large/hauteur
  useWebWorker: true,     // Compression asynchrone (ne bloque pas l'UI)
  fileType: 'image/webp', // Convertir en WebP (plus léger)
  initialQuality: 0.8,    // Qualité initiale
  alwaysKeepResolution: false,
};

// Taille minimum pour déclencher la compression (500KB)
const MIN_COMPRESSION_SIZE = 500 * 1024;

// ============================================================================
// 🔹 COMPOSANTS RÉUTILISABLES
// ============================================================================

const NativeSelect = ({
  label, value, onChange, options, placeholder = 'Sélectionner...',
  error, required = false, disabled = false,
}: {
  label: string; value: string; onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>; placeholder?: string;
  error?: string; required?: boolean; disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label} {required && '*'}</Label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition ${
        error ? 'border-destructive' : 'border-border'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const FormInput = ({
  label, error, required = false, ...props
}: {
  label: string; error?: string; required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label} {required && '*'}</Label>
    <Input
      {...props}
      className={`bg-background ${error ? 'border-destructive' : 'border-border'}`}
      required={required}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

/**
 * Badge de taille de fichier avec compression
 */
const FileSizeBadge = ({ original, compressed }: { original: number; compressed: number }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const ratio = ((1 - compressed / original) * 100).toFixed(0);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground line-through">{formatSize(original)}</span>
      <span className="text-emerald-600 font-medium">{formatSize(compressed)}</span>
      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full font-semibold">
        -{ratio}%
      </span>
    </div>
  );
};

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const normalizeCategories = (data: any): Category[] => {
  if (!data) return [];
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.data?.categories)) return data.data.categories;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeProducts = (data: any): Product[] => {
  if (!data) return [];
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

/**
 * Compresse une image si nécessaire
 */
const compressImage = async (file: File): Promise<CompressedImage> => {
  const preview = URL.createObjectURL(file);
  const originalSize = file.size;

  // ✅ Ne pas compresser si déjà petit
  if (file.size < MIN_COMPRESSION_SIZE) {
    return {
      file,
      preview,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }

  try {
    console.log(`🗜️ Compressing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    
    // ✅ Renommer en .webp
    const newName = file.name.replace(/\.[^.]+$/, '.webp');
    const webpFile = new File([compressedFile], newName, { type: 'image/webp' });
    
    const compressedSize = webpFile.size;
    const compressionRatio = compressedSize / originalSize;

    console.log(`✅ Compressed: ${file.name} → ${newName} (${(originalSize/1024/1024).toFixed(2)}MB → ${(compressedSize/1024/1024).toFixed(2)}MB, -${((1-compressionRatio)*100).toFixed(0)}%)`);

    // ✅ Révoquer l'ancien preview et créer le nouveau
    URL.revokeObjectURL(preview);
    const newPreview = URL.createObjectURL(webpFile);

    return {
      file: webpFile,
      preview: newPreview,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (err) {
    console.warn('⚠️ Compression failed, using original:', file.name, err);
    return {
      file,
      preview,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductsAdminPage() {
  useRequireAdmin();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  
  // ✅ Nouveaux états pour la compression
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });

  const [formData, setFormData] = useState<FormData>({
    name: '', description: '', basePrice: '', category: '',
    type: 'shoes', brand: '', totalStock: '0',
  });

  // ✅ Stats de compression
  const compressionStats = useMemo(() => {
    const totalOriginal = compressedImages.reduce((sum, img) => sum + img.originalSize, 0);
    const totalCompressed = compressedImages.reduce((sum, img) => sum + img.compressedSize, 0);
    const saved = totalOriginal - totalCompressed;
    const ratio = totalOriginal > 0 ? (saved / totalOriginal) * 100 : 0;
    
    return {
      totalOriginal,
      totalCompressed,
      saved,
      ratio,
      count: compressedImages.length,
    };
  }, [compressedImages]);

  // ============================================================================
  // 🔹 FETCH DATA
  // ============================================================================

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesError(null);
      
      const response = await fetch('http://localhost:5000/api/v1/categories', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const cats = normalizeCategories(data);
      setCategories(cats);

      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: cats[0]._id! }));
      }
    } catch (err: any) {
      console.error('❌ [Categories] Failed:', err);
      setCategoriesError(err.message || 'Impossible de charger les catégories');
      setCategories([]);
    }
  }, [formData.category]);

  const loadProducts = useCallback(async () => {
    try {
      const response = await apiClient.get('/products', {
        params: { page: 1, limit: 50 },
        timeout: 10000,
      });
      setProducts(normalizeProducts(response));
    } catch (err: any) {
      console.error('❌ [Products] Failed:', err);
      setError(err.message || 'Impossible de charger les produits');
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCategoriesError(null);
      await Promise.all([loadProducts(), loadCategories()]);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadCategories]);

  useEffect(() => { loadData(); }, [loadData]);

  // ============================================================================
  // 🔹 IMAGE COMPRESSION
  // ============================================================================

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // ✅ Validation : max 10 images au total
    if (compressedImages.length + files.length > 10) {
      setError('Maximum 10 images autorisées');
      return;
    }

    // ✅ Validation : types acceptés
    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError(`Fichiers invalides: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    try {
      setCompressing(true);
      setCompressionProgress({ current: 0, total: files.length });
      setError(null);

      const results: CompressedImage[] = [];

      // ✅ Compresser chaque image séquentiellement pour voir la progression
      for (let i = 0; i < files.length; i++) {
        setCompressionProgress({ current: i + 1, total: files.length });
        const compressed = await compressImage(files[i]);
        results.push(compressed);
      }

      // ✅ Ajouter aux images existantes
      setCompressedImages(prev => [...prev, ...results]);
      
      // ✅ Message de succès si compression significative
      const totalSaved = results.reduce((sum, img) => sum + (img.originalSize - img.compressedSize), 0);
      if (totalSaved > 0) {
        console.log(`💾 Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)}MB`);
      }
    } catch (err: any) {
      console.error('❌ Compression error:', err);
      setError('Erreur lors de la compression des images');
    } finally {
      setCompressing(false);
      setCompressionProgress({ current: 0, total: 0 });
      e.target.value = '';
    }
  };

  const removeImage = useCallback((index: number) => {
    setCompressedImages(prev => {
      const newImages = [...prev];
      // ✅ Révoquer l'URL pour éviter les fuites mémoire
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  // ✅ Cleanup des URLs au démontage
  useEffect(() => {
    return () => {
      compressedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  // ============================================================================
  // 🔹 HANDLERS
  // ============================================================================

  const resetForm = useCallback(() => {
    // ✅ Cleanup des previews
    compressedImages.forEach(img => URL.revokeObjectURL(img.preview));
    
    setFormData({
      name: '', description: '', basePrice: '',
      category: categories[0]?._id || '', type: 'shoes',
      brand: '', totalStock: '0',
    });
    setCompressedImages([]);
    setFormErrors({});
    setError(null);
    setMessage(null);
  }, [categories, compressedImages]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Le nom est requis';
    if (!formData.description.trim()) errors.description = 'La description est requise';
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      errors.basePrice = 'Prix invalide';
    }
    if (!formData.category) errors.category = 'Sélectionnez une catégorie';
    if (!formData.totalStock || parseInt(formData.totalStock) < 0) {
      errors.totalStock = 'Stock invalide';
    }
    if (compressedImages.length === 0) {
      errors.images = 'Au moins une image est requise';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setMessage(null);
    setError(null);

    try {
      setSaving(true);

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('basePrice', (parseFloat(formData.basePrice) || 0).toString());
      formDataToSend.append('category', formData.category);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('brand', formData.brand.trim());
      formDataToSend.append('totalStock', (parseInt(formData.totalStock) || 0).toString());

      // ✅ Ajouter les fichiers compressés
      compressedImages.forEach((img) => {
        formDataToSend.append('images', img.file);
      });

      console.log('📤 [Product] Sending:', {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        imagesCount: compressedImages.length,
        totalSize: `${(compressionStats.totalCompressed / 1024 / 1024).toFixed(2)}MB`,
      });

      await apiClient.upload('/products', formDataToSend);
      
      setMessage('✅ Produit ajouté avec succès');
      setModalOpen(false);
      resetForm();
      await loadProducts();
      
    } catch (err: any) {
      console.error('❌ Error creating product:', err);

      let errorMessage = 'Impossible de créer le produit';
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errorMessage = err.response.data.errors.map((e: any) => e.message || e.msg).join(', ');
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ============================================================================
  // 🔹 LOADING STATE
  // ============================================================================

  if (loading && products.length === 0 && categories.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔹 RENDER
  // ============================================================================

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des Produits</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue et ajoutez rapidement de nouveaux articles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" variant="outline" onClick={loadData} className="gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button
            size="lg" variant="primary"
            onClick={() => { resetForm(); setModalOpen(true); }}
            className="gap-2" disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Nouveau Produit
          </Button>
        </div>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
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
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                <button onClick={loadData} className="text-xs underline mt-1 hover:text-destructive/80">
                  Réessayer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table des produits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement des produits...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-12 h-12 opacity-50" />
                      <p>Aucun produit trouvé</p>
                      <Button variant="outline" size="sm" onClick={() => { resetForm(); setModalOpen(true); }}>
                        Ajouter un produit
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {product.images?.[0] ? (
                            <img
                              src={typeof product.images[0] === 'string' 
                                ? product.images[0] 
                                : product.images[0]?.url || '/placeholder.png'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.brand && (
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        {typeof product.category === 'object' 
                          ? product.category?.name 
                          : product.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground capitalize">
                        {product.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{formatPrice(product.basePrice)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (product.totalStock || 0) > 10
                          ? 'bg-green-500/10 text-green-600'
                          : (product.totalStock || 0) > 0
                            ? 'bg-yellow-500/10 text-yellow-600'
                            : 'bg-destructive/10 text-destructive'
                      }`}>
                        {product.totalStock || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-accent hover:text-accent/80">
                          Éditer
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive/80">
                          Supprimer
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

      {/* ================================================================== */}
      {/* MODAL D'AJOUT DE PRODUIT */}
      {/* ================================================================== */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="Ajouter un produit"
        description="Remplissez les informations ci-dessous pour créer un nouveau produit."
        size="2xl"
        actions={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" form="new-product-form" variant="primary" disabled={saving || compressing}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</>
              ) : (
                'Créer le produit'
              )}
            </Button>
          </>
        }
      >
        <form id="new-product-form" className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Section: Informations de base */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Informations de base
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Nom du produit" placeholder="Ex: Sneakers Premium"
                value={formData.name} onChange={(e) => handleFieldChange('name')(e.target.value)}
                error={formErrors.name} required
              />
              <FormInput
                label="Marque" placeholder="Ex: Bokoma"
                value={formData.brand} onChange={(e) => handleFieldChange('brand')(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </Label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFieldChange('description')(e.target.value)}
                className={`w-full min-h-[100px] px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition ${
                  formErrors.description ? 'border-destructive' : 'border-border'
                }`}
                placeholder="Décrivez votre produit..."
                required
              />
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>
          </div>

          {/* Section: Classification */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Classification
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {categories.length > 0 ? (
                <NativeSelect
                  label="Catégorie" value={formData.category}
                  onChange={handleFieldChange('category')}
                  options={categories.map(cat => ({ value: cat._id!, label: cat.name }))}
                  placeholder="Sélectionner une catégorie"
                  error={formErrors.category} required
                />
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Catégorie <span className="text-destructive">*</span>
                  </Label>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-700">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement...
                      </div>
                    ) : categoriesError ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">Erreur de chargement</span>
                        </div>
                        <p className="text-xs">{categoriesError}</p>
                        <Button type="button" variant="outline" size="sm" onClick={loadCategories} className="mt-2">
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Réessayer
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Aucune catégorie disponible
                      </div>
                    )}
                  </div>
                </div>
              )}

              <NativeSelect
                label="Type" value={formData.type}
                onChange={handleFieldChange('type')}
                options={PRODUCT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                required
              />
            </div>
          </div>

          {/* Section: Prix et stock */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Prix & Stock
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Prix de base (FCFA)" type="number" min="0" step="100" placeholder="0"
                value={formData.basePrice} onChange={(e) => handleFieldChange('basePrice')(e.target.value)}
                error={formErrors.basePrice} required
              />
              <FormInput
                label="Stock initial" type="number" min="0" placeholder="0"
                value={formData.totalStock} onChange={(e) => handleFieldChange('totalStock')(e.target.value)}
                error={formErrors.totalStock} required
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* Section: Images avec compression */}
          {/* ================================================================ */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Images
              </h3>
              {compressedImages.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {compressedImages.length}/10 images
                </span>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium block">
                Photos du produit
                {formErrors.images && (
                  <span className="text-destructive text-xs ml-2">({formErrors.images})</span>
                )}
              </Label>

              {/* ✅ Info compression */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-700">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Compression automatique</p>
                  <p className="text-blue-600/80">
                    Les images de plus de 500KB seront automatiquement compressées et converties en WebP pour optimiser les performances.
                  </p>
                </div>
              </div>

              {/* ✅ Zone d'upload */}
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg ${
                formErrors.images
                  ? 'border-destructive/50 bg-destructive/5'
                  : compressing
                    ? 'border-accent/50 bg-accent/5 cursor-wait'
                    : 'border-border hover:border-accent/50 hover:bg-accent/5'
              } cursor-pointer transition group ${compressing ? 'pointer-events-none' : ''}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {compressing ? (
                    <>
                      <Loader2 className="w-8 h-8 text-accent mb-2 animate-spin" />
                      <p className="text-sm text-muted-foreground font-medium">
                        Compression en cours...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Image {compressionProgress.current} / {compressionProgress.total}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-accent transition" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-accent">Cliquez pour uploader</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, WEBP • Auto-compression au-delà de 500KB
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageUpload}
                  disabled={compressing || compressedImages.length >= 10}
                />
              </label>

              {/* ✅ Stats de compression */}
              {compressionStats.count > 0 && compressionStats.saved > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">
                      Optimisation appliquée
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground line-through mr-2">
                      {(compressionStats.totalOriginal / 1024 / 1024).toFixed(2)}MB
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      {(compressionStats.totalCompressed / 1024 / 1024).toFixed(2)}MB
                    </span>
                    <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-semibold">
                      -{compressionStats.ratio.toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              )}

              {/* ✅ Prévisualisation avec stats par image */}
              {compressedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AnimatePresence>
                    {compressedImages.map((img, index) => (
                      <motion.div
                        key={img.file.name + index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                      >
                        <img
                          src={img.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* ✅ Overlay avec stats */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FileSizeBadge original={img.originalSize} compressed={img.compressedSize} />
                        </div>

                        {/* ✅ Badge primary */}
                        {index === 0 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent text-accent-foreground rounded text-[10px] font-semibold">
                            Principal
                          </div>
                        )}

                        {/* ✅ Bouton supprimer */}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          disabled={compressing}
                          className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-destructive/90 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Erreur globale */}
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