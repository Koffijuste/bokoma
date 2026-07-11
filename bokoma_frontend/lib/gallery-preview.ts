// lib/gallery-preview.ts
// ============================================================================
// 🎬 GALLERY PREVIEW HELPER — détermine quoi afficher dans une card média
// ============================================================================
// But : permettre à l'admin (et au public) de voir le contenu d'une vidéo
// sans avoir à la lancer. Pour les images c'est trivial. Pour les vidéos :
//   1. YouTube : auto-fetch du thumbnail via img.youtube.com
//   2. Vidéos directes (mp4, cloudinary, local, other) : <video preload=metadata>
//      seek à 0.1s pour afficher la première frame comme poster
//   3. Sinon (Vimeo, TikTok, etc. sans thumbnail) : placeholder styled
// ============================================================================

import type { GalleryItem } from '@/types';

export type GalleryPreview =
  | { kind: 'image';  src: string }                  // URL d'image (img)
  | { kind: 'video';  src: string; provider?: string } // URL vidéo (HTML5 <video>)
  | { kind: 'none' };

/**
 * Extrait l'ID d'une vidéo YouTube depuis n'importe quelle URL
 * (watch?v=, youtu.be/, /embed/, /shorts/).
 */
export const extractYouTubeId = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const m = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

/**
 * Liste des providers pour lesquels on peut charger la vidéo directement
 * via <video src=...> et obtenir une première frame.
 */
const DIRECT_VIDEO_PROVIDERS = new Set(['mp4', 'cloudinary', 'local', 'other']);

/**
 * Détermine le mode de preview d'un item gallery.
 */
export const getItemPreview = (item: GalleryItem): GalleryPreview => {
  // Image : on prend le thumbnail, sinon l'URL elle-même
  if (item.type === 'image') {
    const src = item.thumbnail || item.url;
    return src ? { kind: 'image', src } : { kind: 'none' };
  }

  // Vidéo : priorité 1 = thumbnail explicite
  if (item.thumbnail) {
    return { kind: 'image', src: item.thumbnail };
  }

  // Vidéo : priorité 2 = YouTube auto-fetch
  const ytId = extractYouTubeId(item.url);
  if (ytId) {
    return { kind: 'image', src: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` };
  }

  // Vidéo : priorité 3 = URL directe jouable par <video>
  if (item.url) {
    const provider = item.provider;
    if (!provider || DIRECT_VIDEO_PROVIDERS.has(provider)) {
      return { kind: 'video', src: item.url, provider };
    }
  }

  // Vidéo : aucun preview exploitable → placeholder
  return { kind: 'none' };
};

/**
 * Gradient coloré par provider pour le placeholder vidéo (utilisé sur
 * les 2 pages gallery).
 */
export const getProviderAccent = (provider?: string): string => {
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
