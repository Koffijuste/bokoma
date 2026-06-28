// app/(admin)/dashboard/categories/page.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, AlertCircle, Loader2, Search, 
  X, Check, ChevronDown, ArrowUpDown, FolderTree, 
  Eye, EyeOff, Sparkles, RefreshCw
} from 'lucide-react';
import { useFetch, useMutation } from '@/hooks';
import { categoryApi } from '@/services';

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
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import type { Category, ApiResponse } from '@/types';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  order: number;
  isActive: boolean;
  parent: string;
}

interface CategoryRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  index: number;
  isToggling: boolean;
}

const DEFAULT_FORM_DATA: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  order: 0,
  isActive: true,
  parent: '',
};

const ITEMS_PER_PAGE = 10;

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

const CategoryRow = React.memo<CategoryRowProps>(({ 
  category, 
  onEdit, 
  onDelete, 
  onToggleActive,
  index,
  isToggling,
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <tr
      className={`border-b border-border/50 transition-all duration-200 group animate-in fade-in slide-in-from-left-2 ${
        category.isActive 
          ? 'hover:bg-muted/30' 
          : 'hover:bg-muted/20 bg-muted/10 opacity-60'
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            category.isActive 
              ? 'bg-gradient-to-br from-accent/20 to-accent/5' 
              : 'bg-muted'
          }`}>
            <FolderTree className={`w-5 h-5 ${
              category.isActive ? 'text-accent' : 'text-muted-foreground'
            }`} />
          </div>
          <div>
            <div className="font-medium text-foreground flex items-center gap-2">
              {category.name}
              {!category.isActive && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-destructive/50 text-destructive">
                  Inactif
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <span className="text-muted-foreground/50">/</span>
              {category.slug}
            </div>
          </div>
        </div>
      </td>

      <td className="p-4 hidden md:table-cell">
        <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
          {category.description || <span className="italic text-muted-foreground/50">Aucune description</span>}
        </p>
      </td>

      <td className="p-4">
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="font-medium text-muted-foreground">{category.order ?? 0}</span>
        </div>
      </td>

      <td className="p-4">
        <div className="relative">
          <Switch
            checked={category.isActive}
            onCheckedChange={(checked) => onToggleActive(category._id, checked)}
            disabled={isToggling}
            aria-label={category.isActive ? 'Désactiver la catégorie' : 'Activer la catégorie'}
          />
          {isToggling && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin text-accent" />
            </div>
          )}
        </div>
      </td>

      <td className="p-4">
        <div className={`flex items-center gap-1 transition-all duration-200 ${
          showActions ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
        }`}>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-accent/10 hover:text-accent transition-all"
            onClick={() => onEdit(category)}
            aria-label="Modifier la catégorie"
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={() => onDelete(category._id)}
            aria-label="Supprimer la catégorie"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

CategoryRow.displayName = 'CategoryRow';

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

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          slug: initialData.slug || '',
          description: initialData.description || '',
          order: initialData.order || 0,
          isActive: initialData.isActive ?? true,
          parent: typeof initialData.parent === 'string' ? initialData.parent : '',
        });
        setAutoSlug(false);
      } else {
        setFormData(DEFAULT_FORM_DATA);
        setAutoSlug(true);
      }
      setErrors({});
    }
  }, [open, initialData]);

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
      newErrors.name = 'Minimum 2 caractères';
    }
    
    if (!formData.slug?.trim()) {
      newErrors.slug = 'Le slug est requis';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Uniquement lettres minuscules, chiffres et tirets';
    }
    
    if (formData.order < 0) {
      newErrors.order = 'Ne peut pas être négatif';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }
    
    const payload = {
      ...formData,
      parent: formData.parent || undefined,
    };
    
    try {
      await onSubmit(payload);
    } catch {
      // Error handled by parent
    }
  };

  const rootCategories = useMemo(() => 
    allCategories.filter(c => !c.parent && c._id !== initialData?._id), 
    [allCategories, initialData]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialData ? (
              <>
                <Pencil className="w-5 h-5 text-accent" />
                Modifier la catégorie
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-accent" />
                Nouvelle catégorie
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Modifiez les informations de la catégorie.' 
              : 'Créez une nouvelle catégorie pour organiser vos produits.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom de la catégorie <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Chaussures, Vêtements..."
              className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="autoSlug"
                  checked={autoSlug}
                  onCheckedChange={setAutoSlug}
                  disabled={isLoading}
                />
                <Label htmlFor="autoSlug" className="text-xs text-muted-foreground cursor-pointer font-normal">
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
            {errors.slug ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.slug}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-muted-foreground/50">URL:</span>
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  /products?category={formData.slug || '...'}
                </code>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Catégorie parente</Label>
            <Select
              value={formData.parent || 'none'}
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  parent: value === 'none' ? '' : value
                });
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune (catégorie racine)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-muted-foreground" />
                    Aucune (racine)
                  </span>
                </SelectItem>
                {rootCategories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Catégorie active
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Visible sur le site
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {initialData ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {initialData ? 'Mettre à jour' : 'Créer la catégorie'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Supprimer la catégorie
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              Cette action est irréversible. La catégorie <strong className="text-foreground">"{categoryName}"</strong> sera définitivement supprimée.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Les produits associés à cette catégorie ne seront pas supprimés, mais ils ne seront plus filtrables par cette catégorie.</p>
              <p className="text-xs text-destructive/80 font-medium">
                ⚠️ Cette action ne peut pas être annulée.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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

export default function DashboardCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'order' | 'createdAt'>('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

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

  const createMutation = useMutation<ApiResponse<{ category: Category }>, CategoryFormData>(
    (data) => categoryApi.createCategory(data),
    {
      onSuccess: () => {
        toast.success('Catégorie créée avec succès');
        refetch();
      },
      onError: (err) => {
        toast.error(err?.message || 'Erreur lors de la création');
      },
    }
  );

  const updateMutation = useMutation<ApiResponse<{ category: Category }>, CategoryFormData & { id: string }>(
    ({ id, ...data }) => categoryApi.updateCategory(id, data),
    {
      onSuccess: () => {
        toast.success('Catégorie mise à jour');
        setTogglingId(null);
        refetch();
      },
      onError: (err) => {
        setTogglingId(null);
        toast.error(err?.message || 'Erreur lors de la mise à jour');
      },
    }
  );

  const deleteMutation = useMutation<ApiResponse, string>(
    (id) => categoryApi.deleteCategory(id),
    {
      onSuccess: () => {
        toast.success('Catégorie supprimée');
        refetch();
      },
      onError: (err) => {
        toast.error(err?.message || 'Erreur lors de la suppression');
      },
    }
  );

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
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory._id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }, [selectedCategory, createMutation, updateMutation]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;
    deleteMutation.mutate(selectedCategory._id);
    setDeleteDialogOpen(false);
    setSelectedCategory(null);
  }, [selectedCategory, deleteMutation]);

  const handleToggleActive = useCallback((id: string, isActive: boolean) => {
    setTogglingId(id);
    
    updateMutation.mutate(
      { id, isActive },
      {
        onSuccess: () => {
          toast.success(isActive ? 'Catégorie activée' : 'Catégorie désactivée');
          setTogglingId(null);
          refetch();
        },
        onError: () => {
          setTogglingId(null);
          toast.error('Erreur lors de la mise à jour');
          refetch();
        },
      }
    );
  }, [updateMutation]);

  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cat => 
        cat.name.toLowerCase().includes(query) ||
        cat.slug?.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
      );
    }
    
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

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedCategories, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedCategories.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortDir]);

  const activeCount = categories.filter(c => c.isActive).length;
  const inactiveCount = categories.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories"
        description="Organisez et gérez les catégories de votre boutique"
        icon={<FolderTree className="w-5 h-5 text-accent" />}
        showBackButton
        breadcrumbs={[
          { label: 'Catégories' }
        ]}
        actions={
          <>
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1">
              <Eye className="w-3 h-3" />
              {activeCount} actives
            </Badge>
            {inactiveCount > 0 && (
              <Badge variant="outline" className="hidden sm:inline-flex gap-1 text-muted-foreground">
                <EyeOff className="w-3 h-3" />
                {inactiveCount} inactives
              </Badge>
            )}
            <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <FolderTree className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold">{categories.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Actives</p>
            <Eye className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Inactives</p>
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Racines</p>
            <FolderTree className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {categories.filter(c => !c.parent).length}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-card border border-border rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une catégorie..."
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={sortBy}
            onValueChange={(value: 'name' | 'order' | 'createdAt') => setSortBy(value)}
          >
            <SelectTrigger className="w-full sm:w-36">
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
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={fetching}
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Catégorie
                </th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Description
                </th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ordre
                </th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Statut
                </th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </td>
                </tr>
              ) : paginatedCategories.length > 0 ? (
                paginatedCategories.map((category, index) => (
                  <CategoryRow
                    key={category._id}
                    category={category}
                    onEdit={handleOpenEdit}
                    onDelete={handleOpenDelete}
                    onToggleActive={handleToggleActive}
                    index={index}
                    isToggling={togglingId === category._id}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                        <FolderTree className="w-8 h-8 text-accent opacity-50" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Aucune catégorie</p>
                        <p className="text-sm">Commencez par créer votre première catégorie</p>
                      </div>
                      <Button onClick={handleOpenCreate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Créer une catégorie
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl animate-in fade-in duration-500 delay-300">
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
    </div>
  );
}