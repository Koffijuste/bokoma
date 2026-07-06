// app/(admin)/dashboard/gallery/page.tsx
// ============================================================================
// 🖼️ ADMIN — Gestion de la galerie Bokoma
// ============================================================================
// Optimisé :
//  - Zéro framer-motion (animations CSS natives : fade-up, fade-in)
//  - Zéro browser-image-compression → lib/image-compress (canvas natif)
//  - Lazy loading sur les <img>
//  - Mémoïsation des filtres / catégories
// ============================================================================
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Edit3, Save, X, Search, Star, Loader2, Image as ImageIcon,
  Play, Eye, EyeOff, RefreshCcw,
  ChevronLeft, ChevronRight, Upload, Link as LinkIcon, FileVideo, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { galleryApi } from '@/services';
import { cn, formatBytes } from '@/utils/helpers';
import { compressImage, computeCompressionInfo } from '@/lib/image-compress';
import type {
  GalleryItem,
  GalleryType,
  GalleryCategory,
  GalleryProvider,
  CreateGalleryItemPayload,
} from '@/types';

// ============================================================================
// 🔹 CONSTANTES
// ============================================================================

const CATEGORIES: ReadonlyArray<{ id: GalleryCategory; label: string }> = [
  { id: 'collection',       label: 'Collection' },
  { id: 'lookbook',         label: 'Lookbook' },
  { id: 'produit',          label: 'Produit' },
  { id: 'evenement',        label: 'Événement' },
  { id: 'temoignage',       label: 'Témoignage' },
  { id: 'arriere-boutique', label: 'Arrière-boutique' },
  { id: 'autre',            label: 'Autre' },
];

const PROVIDERS: GalleryProvider[] = ['cloudinary', 'youtube', 'vimeo', 'mp4', 'local', 'other'];

const PAGE_SIZE = 20;

// ============================================================================
// 🔹 COMPRESSION IMAGE — utilise le helper natif
// ============================================================================

const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2560,
  fileType: 'image/webp' as const,
  initialQuality: 0.85,
};

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

const inferTypeFromFile = (file: File): GalleryType | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

const compressImageIfNeeded = async (file: File): Promise<File> => {
  if (file.size < 500 * 1024) return file;
  try {
    return await compressImage(file, IMAGE_COMPRESSION_OPTIONS);
  } catch (err) {
    console.warn('⚠️ [Gallery] Compression échouée, envoi du fichier original:', err);
    return file;
  }
};

// ============================================================================
// 🔹 MODALE D'ÉDITION / CRÉATION
// ============================================================================

interface ItemModalProps {
  open: boolean;
  initial?: GalleryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const ItemModal: React.FC<ItemModalProps> = ({ open, initial, onClose, onSaved }) => {
  const emptyDraft: CreateGalleryItemPayload = {
    title: '',
    description: '',
    type: 'image',
    url: '',
    thumbnail: '',
    provider: 'cloudinary',
    category: 'produit',
    tags: [],
    isPublished: true,
    isFeatured: false,
    order: 0,
  };

  const [draft, setDraft] = useState<CreateGalleryItemPayload>(emptyDraft);
  const [tagsInput, setTagsInput] = useState('');

  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number; compressed: number; ratio: number;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft({
        title: initial.title,
        description: initial.description ?? '',
        type: initial.type,
        url: initial.url,
        thumbnail: initial.thumbnail ?? '',
        provider: initial.provider ?? 'cloudinary',
        category: (initial.category as GalleryCategory) ?? 'produit',
        tags: initial.tags ?? [],
        isPublished: initial.isPublished,
        isFeatured: initial.isFeatured,
        order: initial.order,
      });
      setTagsInput((initial.tags ?? []).join(', '));
      setUploadMode(initial.provider === 'cloudinary' ? 'upload' : 'url');
    } else {
      setDraft(emptyDraft);
      setTagsInput('');
      setUploadMode('upload');
    }
    setSelectedFile(null);
    setFilePreview(null);
    setCompressing(false);
    setCompressionInfo(null);
  }, [open, initial]);

  // Cleanup de l'URL de preview
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  if (!open) return null;

  const set = <K extends keyof CreateGalleryItemPayload>(k: K, v: CreateGalleryItemPayload[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = inferTypeFromFile(file);
    if (!type) {
      toast.error(`Format non supporté : ${file.type || 'inconnu'}`);
      return;
    }

    const maxBytes = type === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      toast.error(`Fichier trop volumineux (max ${formatBytes(maxBytes)})`);
      return;
    }

    if (filePreview) URL.revokeObjectURL(filePreview);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    setDraft((d) => ({ ...d, type }));

    if (type === 'image') {
      setCompressing(true);
      try {
        const compressed = await compressImageIfNeeded(file);
        const info = computeCompressionInfo(file.size, compressed.size);
        setCompressionInfo(info);
        if (compressed.size !== file.size) {
          setSelectedFile(compressed);
          const newPreview = URL.createObjectURL(compressed);
          if (filePreview) URL.revokeObjectURL(filePreview);
          setFilePreview(newPreview);
        } else {
          setSelectedFile(file);
          setCompressionInfo({ original: file.size, compressed: file.size, ratio: 0 });
        }
      } catch (err) {
        console.warn('⚠️ Compression échouée, fichier original utilisé:', err);
        setSelectedFile(file);
        setCompressionInfo({ original: file.size, compressed: file.size, ratio: 0 });
      } finally {
        setCompressing(false);
      }
    } else {
      setSelectedFile(file);
      setCompressionInfo(null);
    }

    e.target.value = '';
  };

  const removeSelectedFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setCompressionInfo(null);
  };

  const validateAndSubmit = async () => {
    if (!draft.title.trim()) { toast.error('Titre requis'); return; }

    if (uploadMode === 'upload') {
      if (!selectedFile && !draft.url?.trim() && !initial) {
        toast.error('Sélectionnez un fichier à uploader');
        return;
      }
    } else {
      if (!draft.url?.trim()) {
        toast.error('URL du média requise');
        return;
      }
    }
    if (!['image', 'video'].includes(draft.type)) { toast.error('Type invalide'); return; }

    setSaving(true);
    try {
      const payload: Partial<CreateGalleryItemPayload> = {
        ...draft,
        tags: tagsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        title: draft.title.trim(),
        description: draft.description?.trim() ?? '',
      };

      const shouldUploadFile =
        uploadMode === 'upload' && !!selectedFile &&
        (draft.provider === 'cloudinary' || !draft.provider);

      if (initial?._id) {
        await galleryApi.update(initial._id, payload, shouldUploadFile ? selectedFile! : undefined);
        toast.success('Média mis à jour');
      } else {
        await galleryApi.create(payload as CreateGalleryItemPayload, shouldUploadFile ? selectedFile! : undefined);
        toast.success('Média ajouté à la galerie');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Sauvegarde impossible', {
        description: err?.response?.data?.message || err?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const currentPreview = filePreview || draft.url || '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold">
            {initial ? 'Modifier le média' : 'Ajouter un média'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['image', 'video'] as GalleryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-150',
                    draft.type === t
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/40'
                  )}
                >
                  {t === 'image' ? <ImageIcon className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span className="font-semibold">{t === 'image' ? 'Image' : 'Vidéo'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Titre *</label>
            <Input
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex : Collection été 2026 — shooting"
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Une courte description du média…"
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Section média — Upload OU URL */}
          <div>
            <label className="text-sm font-medium mb-2 block">Média *</label>

            <div className="flex gap-1 bg-muted/50 rounded-full p-1 mb-3">
              <button
                type="button"
                onClick={() => setUploadMode('upload')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5',
                  uploadMode === 'upload' ? 'bg-accent text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="w-3.5 h-3.5" /> Uploader un fichier
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5',
                  uploadMode === 'url' ? 'bg-accent text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LinkIcon className="w-3.5 h-3.5" /> URL externe
              </button>
            </div>

            {uploadMode === 'upload' ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={draft.type === 'video' ? 'video/mp4,video/webm,video/quicktime,video/x-m4v' : 'image/jpeg,image/jpg,image/png,image/webp,image/gif'}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!selectedFile && !currentPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={compressing}
                    className="w-full border-2 border-dashed border-border hover:border-accent/60 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {draft.type === 'video' ? <FileVideo className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                    </div>
                    <span className="text-sm font-medium">
                      Cliquez pour {draft.type === 'video' ? 'choisir une vidéo' : 'choisir une image'}
                    </span>
                    <span className="text-xs">
                      {draft.type === 'video'
                        ? `MP4, WEBM, MOV — max ${formatBytes(MAX_VIDEO_BYTES)}`
                        : `JPEG, PNG, WEBP, GIF — max ${formatBytes(MAX_IMAGE_BYTES)}`}
                    </span>
                  </button>
                ) : (
                  <div className="border border-border rounded-xl p-3 bg-muted/30">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                      {draft.type === 'video' ? (
                        <video
                          src={currentPreview}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentPreview}
                          alt="Aperçu"
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      )}
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                          aria-label="Retirer le fichier"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate flex-1 text-muted-foreground">
                          {selectedFile.name}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatBytes(selectedFile.size)}
                        </span>
                      </div>
                    )}

                    {compressionInfo && compressionInfo.compressed !== compressionInfo.original && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground line-through">
                          {formatBytes(compressionInfo.original)}
                        </span>
                        <span className="text-emerald-600 font-medium">
                          {formatBytes(compressionInfo.compressed)}
                        </span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full font-semibold">
                          -{compressionInfo.ratio}%
                        </span>
                      </div>
                    )}

                    {!selectedFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full mt-1"
                      >
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Remplacer le fichier
                      </Button>
                    )}
                  </div>
                )}

                {compressing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Optimisation de l'image…
                  </div>
                )}

                {initial && !selectedFile && currentPreview && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Aucun nouveau fichier sélectionné — le média actuel sera conservé.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={draft.url}
                  onChange={(e) => set('url', e.target.value)}
                  placeholder={
                    draft.type === 'video' && (draft.provider === 'youtube' || draft.provider === 'vimeo')
                      ? 'https://www.youtube.com/watch?v=…'
                      : 'https://res.cloudinary.com/…'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Pour les vidéos YouTube/Vimeo, collez simplement l'URL publique.
                </p>
              </div>
            )}
          </div>

          {draft.type === 'video' && uploadMode === 'url' && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Miniature (URL)</label>
                <Input
                  value={draft.thumbnail ?? ''}
                  onChange={(e) => set('thumbnail', e.target.value)}
                  placeholder="https://… (optionnel pour YouTube/Vimeo)"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Provider</label>
                <select
                  value={draft.provider ?? 'cloudinary'}
                  onChange={(e) => set('provider', e.target.value as GalleryProvider)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Catégorie</label>
              <select
                value={draft.category ?? 'produit'}
                onChange={(e) => set('category', e.target.value as GalleryCategory)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ordre d'affichage</label>
              <Input
                type="number"
                value={draft.order ?? 0}
                onChange={(e) => set('order', parseInt(e.target.value || '0', 10))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Tags <span className="text-muted-foreground font-normal">(séparés par des virgules)</span>
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="hype, été, sneakers, premium"
            />
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!draft.isPublished}
                onChange={(e) => set('isPublished', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <span className="text-sm">Publié</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!draft.isFeatured}
                onChange={(e) => set('isFeatured', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <span className="text-sm">À la une</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button
            onClick={validateAndSubmit}
            disabled={saving || compressing}
            className="bg-gradient-to-r from-accent to-purple-500 text-white"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement…</> : (
              <><Save className="w-4 h-4 mr-2" /> {initial ? 'Mettre à jour' : 'Ajouter'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = useState<{ total: number; published: number; featured: number } | null>(null);
  const [refetching, setRefetching] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  const cancelledRef = useRef(false);

  const fetchItems = useCallback(async (page: number) => {
    if (page === 1) setLoading(true); else setRefetching(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: PAGE_SIZE,
        isPublished: filter === 'all' ? undefined : filter === 'published',
      };
      if (typeFilter !== 'all') params.type = typeFilter;
      const [listResp, statsResp]: any[] = await Promise.all([
        galleryApi.adminList(params),
        filter === 'all' && page === 1 ? galleryApi.adminStats() : Promise.resolve(null),
      ]);

      if (cancelledRef.current) return;

      // ✅ Lecture défensive : on accepte 3 formats possibles selon l'API.
      //    Format A : { data: GalleryItem[], meta }           (ApiResponse déballé)
      //    Format B : { data: { data: GalleryItem[], meta } } (ApiResponse complet)
      //    Format C : [GalleryItem, …]                        (raw array)
      let meta: { page?: number; pages?: number; total?: number } = {};
      let data: GalleryItem[] = [];

      if (Array.isArray(listResp)) {
        data = listResp;
      } else {
        const wrapper = (listResp as any)?.data ?? {};
        if (Array.isArray(wrapper)) {
          data = wrapper;
        } else if (Array.isArray(wrapper?.data)) {
          data = wrapper.data;
          meta = wrapper.meta ?? {};
        } else if (Array.isArray((listResp as any)?.data?.data)) {
          data = (listResp as any).data.data;
          meta = (listResp as any).data.meta ?? {};
        }
        if (!meta || Object.keys(meta).length === 0) {
          meta = (listResp as any)?.meta ?? {};
        }
      }

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        data = data.filter((it: GalleryItem) =>
          it.title?.toLowerCase().includes(s) ||
          it.description?.toLowerCase().includes(s) ||
          (it.tags || []).some((t) => t.toLowerCase().includes(s))
        );
      }
      setItems(data);
      setPagination({
        page:  meta?.page ?? page,
        pages: meta?.pages ?? 1,
        total: meta?.total ?? data.length,
      });

      // ✅ Stats défensive aussi.
      const statsPayload = (statsResp as any)?.data ?? statsResp;
      if (statsPayload && typeof statsPayload === 'object' && 'total' in statsPayload) {
        setStats({
          total: statsPayload.total,
          published: statsPayload.published,
          featured: statsPayload.featured,
        });
      }
    } catch (err: any) {
      toast.error('Erreur de chargement', { description: err?.message });
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefetching(false);
      }
    }
  }, [filter, typeFilter, searchQuery]);

  useEffect(() => {
    // ✅ Reset strict-mode (cf. page feedbacks) pour ne pas rester bloqué en chargement.
    cancelledRef.current = false;
    fetchItems(1);
    return () => { cancelledRef.current = true; };
  }, [fetchItems]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement « ${title} » ?`)) return;
    try {
      await galleryApi.remove(id);
      toast.success('Média supprimé');
      fetchItems(1);
    } catch (err: any) {
      toast.error('Suppression impossible', { description: err?.message });
    }
  };

  const handleTogglePublished = async (item: GalleryItem) => {
    try {
      await galleryApi.update(item._id, { isPublished: !item.isPublished });
      toast.success(item.isPublished ? 'Média dépublié' : 'Média publié');
      fetchItems(pagination.page);
    } catch (err: any) {
      toast.error('Modification impossible');
    }
  };

  const handleToggleFeatured = async (item: GalleryItem) => {
    try {
      await galleryApi.update(item._id, { isFeatured: !item.isFeatured });
      toast.success(item.isFeatured ? 'Retiré de la une' : 'Ajouté à la une');
      fetchItems(pagination.page);
    } catch (err: any) {
      toast.error('Modification impossible');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔹 RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Galerie</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les médias affichés sur la page publique de la galerie Bokoma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchItems(1)} disabled={loading}>
            <RefreshCcw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Actualiser
          </Button>
          <Button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="bg-gradient-to-r from-accent to-purple-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un média
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 stagger-children">
          {[
            { label: 'Total',        value: stats.total,     color: 'text-foreground' },
            { label: 'Publiés',      value: stats.published, color: 'text-green-500' },
            { label: 'À la une',     value: stats.featured,  color: 'text-amber-500' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase text-muted-foreground tracking-wider">{s.label}</p>
                <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher titre, tag…"
              className="pl-10 w-64"
            />
          </form>

          <div className="flex gap-1 bg-muted/50 rounded-full p-1">
            {(['all', 'published', 'draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150',
                  filter === f ? 'bg-accent text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f === 'all' ? 'Tous' : f === 'published' ? 'Publiés' : 'Brouillons'}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-muted/50 rounded-full p-1">
            {(['all', 'image', 'video'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150',
                  typeFilter === t ? 'bg-accent text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'all' ? 'Tous types' : t === 'image' ? '🖼️ Images' : '🎬 Vidéos'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucun média. Ajoutez-en un pour démarrer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          {items.map((item) => {
            const cat = CATEGORIES.find((c) => c.id === item.category);
            return (
              <Card key={item._id} className="overflow-hidden group hover-lift">
                <div className="relative aspect-square bg-muted">
                  {item.thumbnail || item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail || item.url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.type === 'video' ? <Play className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                    </div>
                  )}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center">
                        <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  {!item.isPublished && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">
                      <EyeOff className="w-4 h-4 mr-2" /> Brouillon
                    </div>
                  )}
                  {item.isFeatured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" fill="currentColor" /> À la une
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description || '—'}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="px-1.5 py-0.5 bg-muted rounded font-medium">{cat?.label ?? item.category}</span>
                    <span className="flex items-center gap-1">
                      {item.type === 'video' ? <Play className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                      {item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t border-border">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleTogglePublished(item)}>
                      {item.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleToggleFeatured(item)}>
                      <Star className={cn('w-3 h-3', item.isFeatured && 'fill-amber-400 text-amber-400')} />
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setEditingItem(item); setModalOpen(true); }}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(item._id, item.title)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 animate-fade-up">
          <Button variant="outline" size="sm" disabled={pagination.page === 1 || refetching} onClick={() => fetchItems(pagination.page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages || refetching} onClick={() => fetchItems(pagination.page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Modale */}
      <ItemModal
        open={modalOpen}
        initial={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchItems(pagination.page)}
      />
    </div>
  );
}
