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
  LayoutGrid, List, Sparkles, Filter, Calendar, Tag,
  MoreVertical, CheckCircle2, Clock,
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

const PROVIDERS: GalleryProvider[] = [
  'cloudinary',
  'youtube',
  'vimeo',
  'facebook',
  'tiktok',
  'instagram',
  'x',
  'mp4',
  'local',
  'other',
];

const PROVIDER_LABELS: Record<GalleryProvider, string> = {
  cloudinary: 'Cloudinary (upload)',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  facebook: 'Facebook (vidéo)',
  tiktok: 'TikTok',
  instagram: 'Instagram (reel / post)',
  x: 'X (Twitter)',
  mp4: 'Fichier MP4 direct',
  local: 'Stockage local',
  other: 'Autre (URL brute)',
};

/**
 * 🔍 Auto-détection du provider à partir d'une URL collée.
 * Retourne le provider correspondant, ou `null` si indéterminé.
 */
const inferProviderFromUrl = (rawUrl: string): GalleryProvider | null => {
  if (!rawUrl) return null;
  const url = rawUrl.toLowerCase().trim();
  if (/(?:youtube\.com|youtu\.be)/.test(url))                            return 'youtube';
  if (/vimeo\.com/.test(url))                                            return 'vimeo';
  if (/(?:facebook\.com|fb\.watch|fb\.com)/.test(url))                   return 'facebook';
  if (/tiktok\.com/.test(url))                                           return 'tiktok';
  if (/instagram\.com/.test(url))                                        return 'instagram';
  if (/(?:twitter\.com|x\.com)/.test(url))                               return 'x';
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url))                           return 'mp4';
  return null;
};

/**
 * 🎬 Extrait l'ID d'une vidéo YouTube à partir de n'importe quelle URL
 * (watch?v=, youtu.be/, /embed/, /shorts/).
 */
const extractYouTubeId = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const m = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

/**
 * 🖼️ Retourne la meilleure URL de miniature disponible pour un item.
 * - Vidéo YouTube : génère le thumbnail standard img.youtube.com
 * - Sinon : utilise item.thumbnail, puis item.url en fallback
 * Retourne null si rien d'exploitable (ex: MP4 distant sans miniature).
 */
const getItemThumbnail = (item: GalleryItem): string | null => {
  if (item.type === 'video') {
    if (item.thumbnail) return item.thumbnail;
    const ytId = extractYouTubeId(item.url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return null; // Pas de miniature connue → on affichera un placeholder
  }
  return item.thumbnail || item.url || null;
};

/**
 * 🎨 Petit gradient coloré par provider pour le placeholder vidéo.
 * Évite le carré noir quand on n'a pas de miniature (YouTube, Vimeo, MP4…).
 */
const getProviderAccent = (provider?: GalleryProvider): string => {
  switch (provider) {
    case 'youtube':    return 'from-red-600/40 via-red-900/60 to-black';
    case 'vimeo':      return 'from-cyan-500/30 via-sky-900/60 to-black';
    case 'tiktok':     return 'from-pink-500/40 via-cyan-500/30 to-black';
    case 'instagram':  return 'from-fuchsia-500/40 via-purple-900/60 to-black';
    case 'facebook':   return 'from-blue-600/40 via-blue-900/60 to-black';
    case 'x':          return 'from-slate-500/40 via-slate-900/60 to-black';
    case 'mp4':        return 'from-amber-500/30 via-slate-900/60 to-black';
    case 'local':      return 'from-emerald-500/30 via-slate-900/60 to-black';
    case 'cloudinary': return 'from-violet-500/30 via-slate-900/60 to-black';
    default:           return 'from-slate-600/40 via-slate-900/70 to-black';
  }
};

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
                  onChange={(e) => {
                    const v = e.target.value;
                    set('url', v);
                    // 🪄 Auto-détection du provider quand une URL reconnaissable est collée
                    // (uniquement pour les vidéos en mode URL)
                    if (draft.type === 'video') {
                      const detected = inferProviderFromUrl(v);
                      if (detected && detected !== draft.provider) {
                        set('provider', detected);
                      }
                    }
                  }}
                  placeholder={
                    draft.type === 'video'
                      ? 'YouTube, Vimeo, Facebook, TikTok, Instagram, X…'
                      : 'https://res.cloudinary.com/…'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  YouTube, Vimeo, Facebook, TikTok, Instagram, X, mp4 direct… le provider est détecté automatiquement.
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
                  placeholder="https://… (optionnel — auto pour YouTube/Vimeo)"
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
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    // Ouvre un vrai modal de confirmation (au lieu d'un confirm() natif).
    setDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await galleryApi.remove(deleteConfirm.id);
      toast.success('Média supprimé');
      setDeleteConfirm(null);
      fetchItems(1);
    } catch (err: any) {
      toast.error('Suppression impossible', { description: err?.message });
    } finally {
      setDeleting(false);
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

  // Fermer le menu contextuel au click-outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-card-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header premium ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Galerie</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez les médias affichés sur la page publique de la galerie Bokoma.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => fetchItems(1)}
            disabled={loading}
            className="gap-2"
            title="Rafraîchir la liste"
          >
            <RefreshCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <Button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 text-white shadow-lg shadow-accent/25 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un média</span>
          </Button>
        </div>
      </div>

      {/* ── Stats cards avec icônes ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-children">
          {[
            { label: 'Total médias', value: stats.total,     icon: ImageIcon, accent: 'from-slate-500/10 to-slate-500/0 ring-slate-500/20', text: 'text-foreground' },
            { label: 'Publiés',      value: stats.published, icon: CheckCircle2, accent: 'from-emerald-500/15 to-emerald-500/0 ring-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'À la une',     value: stats.featured,  icon: Sparkles, accent: 'from-amber-500/15 to-amber-500/0 ring-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5',
                  'ring-1 ring-transparent hover:ring-current hover-lift transition-shadow duration-200',
                )}
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', s.accent)} />
                <div className="relative flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {s.label}
                  </p>
                  <div className={cn('w-9 h-9 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center', s.text)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className={cn('relative text-3xl font-bold tabular-nums', s.text)}>{s.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Recherche */}
          <form onSubmit={handleSearch} className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par titre, description, tag…"
              className="pl-10 h-10"
            />
          </form>

          {/* Chips : statut */}
          <div className="flex gap-1 bg-muted/40 rounded-full p-1 shrink-0 overflow-x-auto">
            {([
              { id: 'all',       label: 'Tous',       icon: Filter },
              { id: 'published', label: 'Publiés',    icon: CheckCircle2 },
              { id: 'draft',     label: 'Brouillons', icon: Clock },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                  'flex items-center gap-1.5',
                  filter === id
                    ? 'bg-gradient-to-r from-accent to-purple-500 text-white shadow-md shadow-accent/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Chips : type */}
          <div className="flex gap-1 bg-muted/40 rounded-full p-1 shrink-0">
            {([
              { id: 'all',   label: 'Tous',     icon: Filter },
              { id: 'image', label: 'Images',   icon: ImageIcon },
              { id: 'video', label: 'Vidéos',   icon: Play },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTypeFilter(id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                  'flex items-center gap-1.5',
                  typeFilter === id
                    ? 'bg-gradient-to-r from-accent to-purple-500 text-white shadow-md shadow-accent/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex gap-1 bg-muted/40 rounded-full p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Vue grille"
              title="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Vue liste"
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Liste ── */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-full animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border-2 border-dashed border-border bg-card/40 animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/10 flex items-center justify-center mb-5">
            <ImageIcon className="w-9 h-9 text-accent" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Aucun média pour le moment</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-5">
            {searchQuery || filter !== 'all' || typeFilter !== 'all'
              ? "Aucun résultat ne correspond à vos critères. Essayez d'élargir les filtres."
              : "Commencez par ajouter votre premier média pour enrichir la page galerie publique."}
          </p>
          <Button
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="bg-gradient-to-r from-accent to-purple-500 text-white shadow-lg shadow-accent/25 gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un média
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 stagger-children">
          {items.map((item) => {
            const cat = CATEGORIES.find((c) => c.id === item.category);
            const isMenuOpen = openMenuId === item._id;
            return (
              <Card
                key={item._id}
                className="overflow-hidden group hover-lift relative"
                data-card-menu
              >
                {/* Thumbnail + overlay */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {(() => {
                    const thumb = getItemThumbnail(item);
                    if (item.type === 'video' && !thumb) {
                      // 🎬 Placeholder stylé quand pas de miniature (YouTube, MP4, etc.)
                      return (
                        <div className={cn(
                          'w-full h-full flex flex-col items-center justify-center text-white relative overflow-hidden bg-gradient-to-br',
                          getProviderAccent(item.provider),
                        )}>
                          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 60%)' }} />
                          <div className="w-16 h-16 rounded-full bg-white/95 text-black flex items-center justify-center shadow-xl mb-3 relative">
                            <Play className="w-7 h-7 ml-0.5" fill="currentColor" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 relative px-2 text-center line-clamp-1">
                            {item.provider ? PROVIDER_LABELS[item.provider] : 'Vidéo'}
                          </span>
                        </div>
                      );
                    }
                    // eslint-disable-next-line @next/next/no-img-element
                    return (
                      <img
                        src={thumb || item.url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                    );
                  })()}

                  {/* Dégradé permanent pour lisibilité des badges */}
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

                  {/* Type indicator (top-left) */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm flex items-center gap-1',
                      item.type === 'video'
                        ? 'bg-rose-500/90 text-white'
                        : 'bg-blue-500/90 text-white'
                    )}>
                      {item.type === 'video' ? <Play className="w-3 h-3" fill="currentColor" /> : <ImageIcon className="w-3 h-3" />}
                      {item.type}
                    </span>
                    {item.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3" fill="currentColor" />
                        À la une
                      </span>
                    )}
                  </div>

                  {/* Bouton supprimer — toujours visible (top-right) */}
                  <button
                    onClick={() => handleDelete(item._id, item.title)}
                    title="Supprimer"
                    aria-label={`Supprimer ${item.title}`}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors backdrop-blur-sm shadow-lg z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Brouillon overlay */}
                  {!item.isPublished && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white font-semibold">
                      <div className="flex items-center gap-2 text-sm">
                        <EyeOff className="w-4 h-4" /> Brouillon
                      </div>
                    </div>
                  )}

                  {/* Vidéo play overlay (toujours visible, plus grand) */}
                  {item.type === 'video' && item.isPublished && getItemThumbnail(item) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-white/95 text-black flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-110">
                        <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  )}

                  {/* Hover actions overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10">
                      <button
                        onClick={() => handleTogglePublished(item)}
                        title={item.isPublished ? 'Dépublier' : 'Publier'}
                        className="flex-1 h-9 rounded-lg text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        {item.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(item)}
                        title={item.isFeatured ? 'Retirer de la une' : 'Mettre à la une'}
                        className={cn(
                          'flex-1 h-9 rounded-lg text-white hover:bg-white/20 flex items-center justify-center transition-colors',
                          item.isFeatured && 'bg-amber-500/30'
                        )}
                      >
                        <Star className={cn('w-4 h-4', item.isFeatured && 'fill-amber-300 text-amber-300')} />
                      </button>
                      <button
                        onClick={() => { setEditingItem(item); setModalOpen(true); }}
                        title="Modifier"
                        className="flex-1 h-9 rounded-lg text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id, item.title)}
                        title="Supprimer"
                        aria-label={`Supprimer ${item.title}`}
                        className="flex-1 h-9 rounded-lg text-white hover:bg-red-500/80 bg-red-500/30 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card content */}
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description || '—'}</p>
                    </div>

                    {/* Menu contextuel (⋮) */}
                    <div className="relative shrink-0" data-card-menu>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : item._id); }}
                        className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        aria-label="Plus d'actions"
                        data-card-menu
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {isMenuOpen && (
                        <div
                          data-card-menu
                          className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-card shadow-xl py-1 animate-fade-up"
                        >
                          <button
                            onClick={() => { setEditingItem(item); setModalOpen(true); setOpenMenuId(null); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            data-card-menu
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Modifier
                          </button>
                          <button
                            onClick={() => { handleTogglePublished(item); setOpenMenuId(null); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            data-card-menu
                          >
                            {item.isPublished ? <><EyeOff className="w-3.5 h-3.5" /> Dépublier</> : <><Eye className="w-3.5 h-3.5" /> Publier</>}
                          </button>
                          <button
                            onClick={() => { handleToggleFeatured(item); setOpenMenuId(null); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            data-card-menu
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {item.isFeatured ? 'Retirer de la une' : 'Mettre à la une'}
                          </button>
                          <div className="h-px bg-border my-1" data-card-menu />
                          <button
                            onClick={() => { handleDelete(item._id, item.title); setOpenMenuId(null); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
                            data-card-menu
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/60">
                    <span className="px-1.5 py-0.5 bg-muted rounded font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {cat?.label ?? item.category}
                    </span>
                    {item.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── Vue liste ── */
        <div className="space-y-2 stagger-children">
          {items.map((item) => {
            const cat = CATEGORIES.find((c) => c.id === item.category);
            const isMenuOpen = openMenuId === item._id;
            return (
              <Card key={item._id} className="overflow-hidden group hover-lift" data-card-menu>
                <div className="flex items-center gap-3 p-3">
                  {/* Mini thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                    {item.thumbnail || item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnail || item.url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.type === 'video' ? <Play className="w-5 h-5 text-muted-foreground" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-4 h-4 text-white" fill="currentColor" />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                      {item.isFeatured && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Une
                        </span>
                      )}
                      {!item.isPublished && (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-bold flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Brouillon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description || '—'}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {item.type === 'video' ? <Play className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        {item.type}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {cat?.label ?? item.category}
                      </span>
                      {item.createdAt && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePublished(item)}
                      title={item.isPublished ? 'Dépublier' : 'Publier'}
                      className="h-9 w-9"
                    >
                      {item.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleFeatured(item)}
                      title={item.isFeatured ? 'Retirer de la une' : 'Mettre à la une'}
                      className="h-9 w-9"
                    >
                      <Star className={cn('w-4 h-4', item.isFeatured && 'fill-amber-400 text-amber-400')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingItem(item); setModalOpen(true); }}
                      title="Modifier"
                      className="h-9 w-9"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item._id, item.title)}
                      title="Supprimer"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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

      {/* Modal de confirmation de suppression (au lieu du confirm() natif) */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !deleting && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="delete-confirm-title" className="text-lg font-bold">
                  Supprimer ce média ?
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 mb-5">
              <p className="text-sm text-muted-foreground">
                Vous allez supprimer définitivement :
              </p>
              <p className="font-semibold text-foreground mt-1 line-clamp-2 break-words">
                « {deleteConfirm.title} »
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Supprimer définitivement</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
