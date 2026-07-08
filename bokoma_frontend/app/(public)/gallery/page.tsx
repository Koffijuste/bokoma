// app/(public)/gallery/page.tsx
// ============================================================================
// 🖼️ PAGE GALERIE BOKOMA — Liste publique des médias (images & vidéos)
// ============================================================================

'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Image as ImageIcon, Play, Search, Filter, X, Loader2, ChevronLeft, ChevronRight,
  Sparkles, Calendar, Tag, ExternalLink, Share2, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { galleryApi } from '@/services';
import { cn } from '@/utils/helpers';
import type { GalleryItem } from '@/types';

// ============================================================================
// 🔹 CONFIGURATION
// ============================================================================

const CATEGORIES = [
  { id: '',              label: 'Tout',          emoji: '🗂️' },
  { id: 'collection',    label: 'Collection',    emoji: '✨' },
  { id: 'lookbook',      label: 'Lookbook',      emoji: '👗' },
  { id: 'produit',       label: 'Produit',       emoji: '🛍️' },
  { id: 'evenement',     label: 'Événement',     emoji: '🎉' },
  { id: 'temoignage',    label: 'Témoignage',    emoji: '💬' },
  { id: 'arriere-boutique', label: 'Arrière-boutique', emoji: '🎬' },
];

const TYPE_FILTERS = [
  { id: 'all',   label: 'Tout',     icon: Filter },
  { id: 'image', label: 'Images',   icon: ImageIcon },
  { id: 'video', label: 'Vidéos',   icon: Play },
];

const PAGE_SIZE = 24;

// ============================================================================
// 🔹 HELPERS
// ============================================================================

const normalizeList = (resp: any): GalleryItem[] => {
  if (!resp) return [];
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  if (Array.isArray(resp?.data))        return resp.data;
  if (Array.isArray(resp))              return resp;
  return [];
};

const getMeta = (resp: any) => resp?.meta ?? resp?.data?.meta ?? { total: 0, page: 1, pages: 1 };

const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  // Patterns courants : watch?v=ID, youtu.be/ID, embed/ID, shorts/ID
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^/?]+)/,
    /youtube\.com\/shorts\/([^/?]+)/,
    /youtu\.be\/([^/?]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
};

const getVimeoId = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m && m[1] ? m[1] : null;
};

// Facebook : on garde l'URL source pour la passer en paramètre `href`
// du plugin vidéo officiel (le plus fiable, accepte watch / share / videos / reels).
const getFacebookEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/i.test(u.hostname)) return null;
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=0`;
  } catch {
    return null;
  }
};

// TikTok : formats /video/ID et /embed/ID
const getTikTokId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
    /tiktok\.com\/embed\/v2?\/(\d+)/,
    /tiktok\.com\/v\/(\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
};

// Instagram : /p/SHORTCODE/ ou /reel/SHORTCODE/
const getInstagramShortcode = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m && m[1] ? m[1] : null;
};

// X (Twitter) : /user/status/ID
const getTweetId = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return m && m[1] ? m[1] : null;
};

const getEmbedUrl = (item: GalleryItem): string | null => {
  if (item.type !== 'video') return null;

  // On tolère un provider absent si l'URL parle d'elle-même
  const provider = item.provider;
  const url = item.url;

  if (provider === 'youtube') {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (provider === 'vimeo') {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (provider === 'facebook') {
    return getFacebookEmbedUrl(url);
  }
  if (provider === 'tiktok') {
    const id = getTikTokId(url);
    return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
  }
  if (provider === 'instagram') {
    const code = getInstagramShortcode(url);
    if (!code) return null;
    // Reel ou post : on détermine le type à partir de l'URL d'origine
    return /\/reel/.test(url)
      ? `https://www.instagram.com/reel/${code}/embed`
      : `https://www.instagram.com/p/${code}/embed`;
  }
  if (provider === 'x') {
    const id = getTweetId(url);
    return id ? `https://platform.twitter.com/embed/Tweet.html?id=${id}` : null;
  }
  return null;
};

// ============================================================================
// 🔹 COMPOSANT : LIGHTBOX
// ============================================================================

interface LightboxProps {
  item: GalleryItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ item, onClose, onPrev, onNext }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const embed = getEmbedUrl(item);
  const isExternal = !!embed;
  const isNative = item.type === 'video' && !isExternal;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/gallery#${item._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url: shareUrl });
      } catch { /* ignore */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Lien copié dans le presse-papiers !');
      } catch {
        toast.error('Impossible de copier le lien');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Fermer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Boutons précédent/suivant */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Précédent"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Suivant"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Contenu */}
      <div
        className="relative w-full h-full max-w-7xl max-h-screen p-4 sm:p-8 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Média */}
        <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
          {item.type === 'image' ? (
            <NextImage
              src={item.url}
              alt={item.title}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          ) : isExternal ? (
            <iframe
              src={embed!}
              title={item.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full max-h-[80vh] aspect-video rounded-xl"
            />
          ) : (
            <video
              ref={videoRef}
              src={item.url}
              poster={item.thumbnail || undefined}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded-xl"
            />
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 w-full max-w-3xl bg-white/10 backdrop-blur-md rounded-xl p-4 text-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/80 font-semibold uppercase">
                {item.categoryLabel || item.category}
              </span>
              {item.isFeatured && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> À la une
                </span>
              )}
            </div>
            <h3 className="font-semibold text-lg truncate">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-white/80 mt-1 line-clamp-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
              {item.relativeTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {item.relativeTime}
                </span>
              )}
              {item.tags && item.tags.length > 0 && (
                <span className="flex items-center gap-1 truncate">
                  <Tag className="w-3 h-3" /> {item.tags.join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/20"
              aria-label="Partager"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            {item.type === 'video' && isNative && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                aria-label="Ouvrir dans un nouvel onglet"
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🔹 COMPOSANT : MEDIA CARD
// ============================================================================

interface MediaCardProps {
  item: GalleryItem;
  onOpen: () => void;
}

const MediaCard: React.FC<MediaCardProps> = React.memo(({ item, onOpen }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isVideo = item.type === 'video';
  const previewUrl = item.thumbnail || (isVideo ? '' : item.url);

  return (
    <button
      onClick={onOpen}
      className="group relative block w-full aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 transition-all duration-300"
      aria-label={`Ouvrir ${item.title}`}
    >
      {!imgError && previewUrl ? (
        <>
          {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
          <NextImage
            src={previewUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              'object-cover transition-all duration-500',
              'group-hover:scale-110',
              imgLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isVideo ? <Play className="w-12 h-12 text-muted-foreground/50" /> : <ImageIcon className="w-12 h-12 text-muted-foreground/50" />}
        </div>
      )}

      {/* Overlay vidéo */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-14 h-14 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Badge type */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-sm flex items-center gap-1">
        {isVideo ? <Play className="w-3 h-3" fill="currentColor" /> : <ImageIcon className="w-3 h-3" />}
        {isVideo ? 'Vidéo' : 'Image'}
      </div>

      {/* Featured badge */}
      {item.isFeatured && (
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> À la une
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-white font-semibold text-sm line-clamp-2 text-left">{item.title}</p>
        {item.description && (
          <p className="text-white/70 text-xs line-clamp-1 mt-0.5 text-left">{item.description}</p>
        )}
      </div>
    </button>
  );
});
MediaCard.displayName = 'MediaCard';

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const cancelledRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 FETCH
  // ═══════════════════════════════════════════════════════════════

  const fetchItems = useCallback(async (page: number) => {
    cancelledRef.current = false;
    setError(null);
    setItems((prev) => {
      if (prev.length === 0) setLoading(true);
      else setRefetching(true);
      return prev;
    });

    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (selectedCategory) params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;
      if (searchQuery) params.search = searchQuery;

      const resp: any = await galleryApi.list(params);
      if (cancelledRef.current) return;

      const data = normalizeList(resp);
      const meta = getMeta(resp);
      setItems(data);
      setPagination({
        page:  meta?.page ?? page,
        total: meta?.total ?? data.length,
        pages: meta?.pages ?? 1,
      });
    } catch (err: any) {
      if (cancelledRef.current) return;
      console.error('❌ Erreur chargement galerie:', err);
      setError(err?.message || 'Impossible de charger la galerie');
      setItems([]);
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefetching(false);
      }
    }
  }, [selectedCategory, selectedType, searchQuery]);

  useEffect(() => {
    fetchItems(1);
    return () => { cancelledRef.current = true; };
  }, [fetchItems]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleTypeChange = (type: 'all' | 'image' | 'video') => {
    setSelectedType(type);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedType('all');
    setSearchInput('');
    setSearchQuery('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  const goPrev = useCallback(() => {
    setLightboxIdx((idx) => {
      if (idx === null) return null;
      return idx === 0 ? items.length - 1 : idx - 1;
    });
  }, [items.length]);

  const goNext = useCallback(() => {
    setLightboxIdx((idx) => {
      if (idx === null) return null;
      return idx === items.length - 1 ? 0 : idx + 1;
    });
  }, [items.length]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedType !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const countsByType = useMemo(() => {
    const acc = { all: items.length, image: 0, video: 0 };
    items.forEach((it) => { acc[it.type] += 1; });
    return acc;
  }, [items]);

  // ═══════════════════════════════════════════════════════════════
  // 🔹 SKELETON
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              Galerie Bokoma
            </h1>
            <p className="text-muted-foreground mt-2">Chargement des créations…</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔹 RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background">
      {/* Barre progression */}
      {refetching && (
        <div
          className="fixed top-0 left-0 right-0 h-1 bg-muted overflow-hidden z-50"
          role="progressbar"
        >
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent animate-[indeterminate_1.2s_linear_infinite]" />
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <section className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" />
            Nos créations
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Galerie <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">Bokoma</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Plongez dans l'univers Bokoma : collections, lookbooks, événements et coulisses.
            Photos & vidéos exclusives pour découvrir nos produits autrement.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span>{pagination.total} média{pagination.total !== 1 ? 's' : ''} publié{pagination.total !== 1 ? 's' : ''}</span>
            {refetching && (
              <>
                <span>•</span>
                <Loader2 className="w-3 h-3 animate-spin text-accent inline" />
              </>
            )}
          </div>
        </section>

        {/* Onglets type */}
        <section className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {TYPE_FILTERS.map(({ id, label, icon: Icon }) => {
              const count = id === 'all' ? countsByType.all : countsByType[id as 'image' | 'video'];
              const active = selectedType === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTypeChange(id as any)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-2',
                    active
                      ? 'bg-gradient-to-r from-accent to-purple-500 text-white border-transparent shadow-lg shadow-accent/20'
                      : 'bg-card border-border hover:border-accent/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                      active ? 'bg-white/20' : 'bg-muted'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Filtres */}
        <section className="mb-6 p-4 bg-card border border-border rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher dans la galerie…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-9"
              aria-label="Rechercher"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Catégories */}
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              variant={!selectedCategory ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange('')}
              className={!selectedCategory ? 'bg-gradient-to-r from-accent to-purple-500' : ''}
            >
              Toutes
            </Button>
            {CATEGORIES.filter((c) => c.id).map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(cat.id)}
                className={selectedCategory === cat.id ? 'bg-gradient-to-r from-accent to-purple-500' : ''}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </Button>
            ))}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </section>

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center justify-between gap-3">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchItems(1)}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Grille */}
        {items.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Aucun média trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Essayez de modifier vos filtres ou revenez plus tard — de nouveaux contenus sont ajoutés régulièrement.
            </p>
            <Button onClick={handleClearFilters} variant="outline">
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <section
            className={cn(
              'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 transition-opacity duration-200',
              refetching && 'opacity-60'
            )}
          >
            {items.map((item, idx) => (
              <div key={item._id} className="animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${(idx % 8) * 30}ms` }}>
                <MediaCard item={item} onOpen={() => openLightbox(idx)} />
              </div>
            ))}
          </section>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <nav className="mt-8 flex justify-center items-center gap-2" aria-label="Pagination galerie">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || refetching}
              onClick={() => fetchItems(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            <span className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              Page {pagination.page} sur {pagination.pages}
              {refetching && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages || refetching}
              onClick={() => fetchItems(pagination.page + 1)}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </nav>
        )}

        {/* CTA */}
        <section className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-accent/10 via-purple-500/10 to-pink-500/10 border border-border text-center">
          <h2 className="text-2xl font-bold">Découvrez nos produits en boutique</h2>
          <p className="text-muted-foreground mt-2 mb-4 max-w-xl mx-auto">
            Explorez notre catalogue complet et profitez de la livraison rapide partout en Côte d'Ivoire.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild className="bg-gradient-to-r from-accent to-purple-500 hover:opacity-90 text-white">
              <Link href="/products">Voir les produits</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/feedback">Partager mon avis</Link>
            </Button>
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && items[lightboxIdx] && (
        <Lightbox
          item={items[lightboxIdx]}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}
