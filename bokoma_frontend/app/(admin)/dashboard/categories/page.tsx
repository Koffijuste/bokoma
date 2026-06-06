// app/(admin)/dashboard/categories/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Pencil, Trash2, AlertCircle, Loader2, Search, 
  X, Check, ChevronDown, ArrowUpDown 
} from 'lucide-react';
import { useFetch, useMutation } from '@/hooks';
import { categoryApi } from '@/services';

// ✅ IMPORTS INDIVIDUELS (shadcn/ui standard)
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NativeSelect } from '@/components/forms/native-select';
import { toast } from 'sonner';
import type { Category, ApiResponse } from '@/types';


// Juste après les imports, avant le composant principal :
// if (process.env.NODE_ENV === 'development') {
//   console.log('🔍 Select import check:', {
//     //Select: typeof Select,  // Doit afficher "function"
//     SelectTrigger: typeof SelectTrigger,
//   });
// }
// ──────────────────────────────────────────────────────────────────────────
// 🔹 TYPES & CONSTANTS
// ──────────────────────────────────────────────────────────────────────────

interface CategoryFormData {
  name: string;
  slug?: string;
  description: string;
  order: number;
  isActive: boolean;
  parent?: string;
}

interface CategoryRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  index: number;
}

const DEFAULT_FORM_DATA: CategoryFormData = {
  name: '',
  description: '',
  order: 0,
  isActive: true,
};

const ITEMS_PER_PAGE = 10;

// ──────────────────────────────────────────────────────────────────────────
// 🔹 HELPERS
// ──────────────────────────────────────────────────────────────────────────

const extractCategories = (data: any): Category[] => {
  if (!data) return [];
  if (Array.isArray(data.categories)) return data.categories;
  if (Array.isArray(data.data?.categories)) return data.data.categories;
  if (Array.isArray(data)) return data;
  return [];
};

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ──────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT: CategoryRow (mémoïsé)
// ──────────────────────────────────────────────────────────────────────────

const CategoryRow = React.memo<CategoryRowProps>(({ 
  category, 
  onEdit, 
  onDelete, 
  onToggleActive,
  index 
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-border hover:bg-muted/30 transition-colors group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Nom & Slug */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium text-foreground">{category.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{category.slug}</div>
          </div>
        </div>
      </td>

      {/* Description */}
      <td className="p-4 hidden md:table-cell">
        <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
          {category.description || <span className="italic">Aucune description</span>}
        </p>
      </td>

      {/* Ordre */}
      <td className="p-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowUpDown className="w-3 h-3" />
          {category.order ?? 0}
        </div>
      </td>

      {/* Statut */}
      <td className="p-4">
        <Switch
          checked={category.isActive}
          onCheckedChange={(checked) => onToggleActive(category._id, checked)}
          aria-label={category.isActive ? 'Désactiver la catégorie' : 'Activer la catégorie'}
        />
      </td>

      {/* Actions */}
      <td className="p-4">
        <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
            onClick={() => onEdit(category)}
            aria-label="Modifier la catégorie"
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
           onClick={() => onDelete(category)} 
            aria-label="Supprimer la catégorie"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
});

CategoryRow.displayName = 'CategoryRow';

// ──────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT: CategoryFormDialog
// ──────────────────────────────────────────────────────────────────────────

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Category | null;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  isLoading: boolean;
  allCategories: Category[];
}

const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
  allCategories,
}) => {
  const [formData, setFormData] = useState<CategoryFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState(true);

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          slug: initialData.slug,
          description: initialData.description || '',
          order: initialData.order || 0,
          isActive: initialData.isActive ?? true,
          parent: typeof initialData.parent === 'string' ? initialData.parent : undefined,
        });
        setAutoSlug(false);
      } else {
        setFormData(DEFAULT_FORM_DATA);
        setAutoSlug(true);
      }
      setErrors({});
    }
  }, [open, initialData]);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, autoSlug]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!formData.slug?.trim()) {
      newErrors.slug = 'Le slug est requis';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets';
    }
    
    if (formData.order < 0) {
      newErrors.order = 'L\'ordre ne peut pas être négatif';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }
    
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (err: any) {
      // Error is handled by parent
    }
  };

  const rootCategories = useMemo(() => 
    allCategories.filter(c => !c.parent), 
    [allCategories]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Modifiez les informations de la catégorie ci-dessous.' 
              : 'Remplissez le formulaire pour créer une nouvelle catégorie.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la catégorie *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Chaussures, Vêtements..."
              className={errors.name ? 'border-destructive' : ''}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="autoSlug"
                  checked={autoSlug}
                  onCheckedChange={setAutoSlug}
                  disabled={isLoading}
                />
                <Label htmlFor="autoSlug" className="text-xs text-muted-foreground cursor-pointer">
                  Auto
                </Label>
              </div>
            </div>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                setFormData({ ...formData, slug: e.target.value });
                setAutoSlug(false);
              }}
              placeholder="ex: chaussures"
              className={`font-mono text-sm ${errors.slug ? 'border-destructive' : ''}`}
              disabled={isLoading || autoSlug}
            />
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug}</p>
            )}
            <p className="text-xs text-muted-foreground">
              URL: /products?category=<span className="font-mono">{formData.slug || '...'}</span>
            </p>
          </div>

          {/* Catégorie parente */}
<div className="space-y-2">
  <Label htmlFor="parent">Catégorie parente</Label>
  <Select
    value={formData.parent || 'none'}
    onValueChange={(value) => {

      setFormData({ 
        ...formData, 
        parent: value === 'none' ? undefined : value 
      });
    }}
    disabled={isLoading}
  >
    <SelectTrigger>
      <SelectValue placeholder="Aucune (catégorie racine)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Aucune (racine)</SelectItem>  // ← ✅ value="none" au lieu de ""
      {rootCategories.map((cat) => (
        <SelectItem 
          key={cat._id} 
          value={cat._id} 
          disabled={cat._id === initialData?._id}
        >
          {cat.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez cette catégorie..."
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Ordre & Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order">Ordre d'affichage</Label>
              <Input
                id="order"
                type="number"
                min={0}
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className={errors.order ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.order && (
                <p className="text-xs text-destructive">{errors.order}</p>
              )}
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={isLoading}
                />
                <Label htmlFor="isActive">Actif</Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" variant="default" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {initialData ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {initialData ? 'Mettre à jour' : 'Créer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT: DeleteConfirmDialog
// ──────────────────────────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  categoryName,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Supprimer la catégorie</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. La catégorie <strong className="text-foreground">"{categoryName}"</strong> sera désactivée et ne sera plus visible sur le site.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>Les produits associés à cette catégorie ne seront pas supprimés, mais ils ne seront plus filtrables par cette catégorie.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 🔹 PAGE PRINCIPALE
// ──────────────────────────────────────────────────────────────────────────

export default function DashboardCategoriesPage() {
  // États
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'order' | 'createdAt'>('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Fetch categories
  const { 
    data: apiResponse, 
    loading: fetching, 
    error, 
    refetch 
  } = useFetch<ApiResponse<{ categories: Category[] }>>(
    () => categoryApi.getCategories(),
    []
  );

  const categories = useMemo(() => extractCategories(apiResponse), [apiResponse]);

  // Mutations avec gestion d'erreur centralisée
  const createMutation = useMutation<ApiResponse<{ category: Category }>, CategoryFormData>(
    (data) => categoryApi.createCategory(data),
    {
      onSuccess: () => {
        toast.success('Catégorie créée avec succès', {
          description: 'La nouvelle catégorie est maintenant disponible.',
        });
        refetch();
      },
      onError: (err) => {
        toast.error('Erreur lors de la création', {
          description: err?.message || 'Une erreur inattendue est survenue',
        });
      },
    }
  );

  const updateMutation = useMutation<ApiResponse<{ category: Category }>, CategoryFormData & { id: string }>(
    ({ id, ...data }) => categoryApi.updateCategory(id, data),
    {
      onSuccess: () => {
        toast.success('Catégorie mise à jour', {
          description: 'Les modifications ont été enregistrées.',
        });
        refetch();
      },
      onError: (err) => {
        toast.error('Erreur lors de la mise à jour', {
          description: err?.message || 'Une erreur inattendue est survenue',
        });
      },
    }
  );

  const deleteMutation = useMutation<ApiResponse, string>(
    (id) => categoryApi.deleteCategory(id),
    {
      onSuccess: () => {
        toast.success('Catégorie supprimée', {
          description: 'La catégorie a été désactivée.',
        });
        refetch();
      },
      onError: (err) => {
        toast.error('Erreur lors de la suppression', {
          description: err?.message || 'Une erreur inattendue est survenue',
        });
      },
    }
  );

  const toggleActiveMutation = useMutation<ApiResponse<{ category: Category }>, { id: string; isActive: boolean }>(
  async ({ id, isActive }) => {
    console.log('📡 Calling updateCategory:', { id, isActive });  // ← Debug API call
    return await categoryApi.updateCategory(id, { isActive });
  },
  {
    onSuccess: (_, variables) => {
      console.log('✅ Toggle success:', variables);  // ← Debug success
      toast.success(variables.isActive ? 'Catégorie activée' : 'Catégorie désactivée');
      refetch();
    },
    onError: (err) => {
      console.error('❌ Toggle error:', err);  // ← Debug error
      toast.error('Erreur lors de la mise à jour du statut');
    },
  }
);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setSelectedCategory(null);
    setFormDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((category: Category) => {
    setSelectedCategory(category);
    setFormDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async (data: CategoryFormData) => {
    try {
      if (selectedCategory) {
        await updateMutation.mutateAsync({ id: selectedCategory._id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch {
      // Error handled by mutation onError
    }
  }, [selectedCategory, createMutation, updateMutation]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;
    
    try {
      await deleteMutation.mutateAsync(selectedCategory._id);
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch {
      // Error handled by mutation onError
    }
  }, [selectedCategory, deleteMutation]);

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
  try {
    console.log('🔄 Toggling active:', { id, isActive });  // ← Debug log
    await toggleActiveMutation.mutateAsync({ id, isActive });
  } catch (err: any) {
    console.error('❌ Toggle active failed:', err);  // ← Error log
      toast.error('Erreur lors de la mise à jour du statut');
    }
  }, [toggleActiveMutation]);

  // Filtrage, tri et pagination
  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];
    
    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cat => 
        cat.name.toLowerCase().includes(query) ||
        cat.slug?.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
      );
    }
    
    // Tri
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'order':
          comparison = (a.order || 0) - (b.order || 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortDir === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [categories, searchQuery, sortBy, sortDir]);

  // Pagination
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedCategories, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedCategories.length / ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortDir]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N: New category
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleOpenCreate();
      }
      // Escape: Close dialogs
      if (e.key === 'Escape') {
        setFormDialogOpen(false);
        setDeleteDialogOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenCreate]);

  // ───────── LOADING STATE ─────────
  if (fetching && !categories.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  // ───────── ERROR STATE ─────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full p-6 rounded-2xl border border-destructive/50 bg-destructive/10 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <div>
            <h3 className="font-semibold text-destructive">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Réessayer
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs text-left w-full">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Détails techniques
                </summary>
                <pre className="mt-2 p-3 bg-background rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────── MAIN RENDER ─────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catégories</h1>
          <p className="text-muted-foreground text-sm">
            Gérez les catégories de produits de votre boutique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''}
          </Badge>
          <Button onClick={handleOpenCreate} variant="default" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nouvelle catégorie</span>
            <span className="sm:hidden">Ajouter</span>
            <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘N
            </kbd>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9"
            aria-label="Rechercher une catégorie"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort & Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={sortBy}
            onValueChange={(value: 'name' | 'order' | 'createdAt') => setSortBy(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order">Ordre</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="createdAt">Date</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir(dir => dir === 'asc' ? 'desc' : 'asc')}
            title={sortDir === 'asc' ? 'Tri croissant' : 'Tri décroissant'}
            aria-label={`Tri ${sortDir === 'asc' ? 'croissant' : 'décroissant'}`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nom</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Description</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ordre</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedCategories.length > 0 ? (
                  paginatedCategories.map((category, index) => (
                    <CategoryRow
                      key={category._id}
                      category={category}
                      onEdit={handleOpenEdit}
                      onDelete={handleOpenDelete}
                      onToggleActive={handleToggleActive}
                      index={index}
                    />
                  ))
                ) : (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b"
                  >
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        {searchQuery ? (
                          <>
                            <Search className="w-8 h-8 opacity-50" />
                            <div>
                              <p className="font-medium">Aucun résultat</p>
                              <p className="text-sm">Aucune catégorie ne correspond à "{searchQuery}"</p>
                            </div>
                            <Button variant="link" onClick={() => setSearchQuery('')} className="text-sm">
                              Effacer la recherche
                            </Button>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-8 h-8 opacity-50" />
                            <div>
                              <p className="font-medium">Aucune catégorie</p>
                              <p className="text-sm">Commencez par créer votre première catégorie</p>
                            </div>
                            <Button variant="default" size="sm" onClick={handleOpenCreate}>
                              <Plus className="w-4 h-4 mr-2" />
                              Créer une catégorie
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages} • {filteredAndSortedCategories.length} résultat{filteredAndSortedCategories.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CategoryFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        initialData={selectedCategory}
        onSubmit={handleSubmit}
        isLoading={createMutation.loading || updateMutation.loading}
        allCategories={categories}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        categoryName={selectedCategory?.name || ''}
        onConfirm={handleDelete}
        isLoading={deleteMutation.loading}
      />

      {/* Keyboard shortcuts hint (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-2 rounded-lg border">
          <kbd className="font-mono">⌘N</kbd> Nouvelle catégorie • <kbd className="font-mono">Esc</kbd> Fermer
        </div>
      )}
    </div>
  );
}