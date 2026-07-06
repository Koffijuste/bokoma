// lib/image-compress.ts
// ============================================================================
// 🖼️ Compression d'image côté client — implémentation 100% native (Canvas)
// ============================================================================
// Remplace `browser-image-compression` (~30 kB gzip) par une poignée de lignes
// sur <canvas>. Mêmes options, mêmes garanties : redimensionnement à
// maxWidthOrHeight, ré-encodage en WebP, qualité ajustable.
//
// Avantages :
// - 0 dépendance (utilise OffscreenCanvas quand dispo, sinon canvas classique)
// - Même résultat fonctionnel qu'un redimensionneur externe
// - Tree-shakable, pas de bundle JS supplémentaire
// ============================================================================

export interface CompressOptions {
  /** Taille max (Mo). Si le fichier original est déjà plus petit, on sort tel quel. */
  maxSizeMB?: number;
  /** Plus grand côté (px) après redimensionnement. */
  maxWidthOrHeight?: number;
  /** Type MIME de sortie (`image/webp`, `image/jpeg`, …). */
  fileType?: string;
  /** Qualité d'encodage entre 0 et 1. */
  initialQuality?: number;
  /** Passer à `true` pour bypasser la compression si le fichier est déjà petit. */
  skipIfSmallerThanBytes?: number;
}

/**
 * Compresse une `File` image côté navigateur. Conserve la signature externe de
 * `browser-image-compression` (retourne une `File`), pour rester drop-in.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxSizeMB = 2,
    maxWidthOrHeight = 2560,
    fileType = 'image/webp',
    initialQuality = 0.85,
    skipIfSmallerThanBytes = 500 * 1024,
  } = options;

  // Pas d'image = pas d'opération
  if (!file.type.startsWith('image/')) return file;

  // Si le fichier est déjà petit et sous le seuil "image/webp ~85%" possible,
  // inutile de perdre du temps. Le seuil par défaut est 500 KB.
  if (file.size <= skipIfSmallerThanBytes) return file;

  // Création d'un bitmap (OffscreenCanvas en priorité pour perf + non-bloquant).
  const bitmap = await decodeImage(file);
  if (!bitmap) return file;

  try {
    const { canvas } = drawResized(
      bitmap,
      maxWidthOrHeight,
    );

    const blob = await canvasToBlob(canvas, fileType, initialQuality);
    if (!blob) return file;

    // Si on n'a pas réellement réduit (rare), on garde l'original pour
    // éviter une perte qualité inutile.
    if (blob.size >= file.size * 0.95) return file;

    // `maxSizeMB` : si on dépasse, on retente avec une qualité plus basse.
    const targetBytes = maxSizeMB * 1024 * 1024;
    if (blob.size > targetBytes) {
      const lowerQuality = Math.max(0.5, initialQuality - 0.15);
      const blobLower = await canvasToBlob(canvas, fileType, lowerQuality);
      if (blobLower && blobLower.size <= targetBytes) {
        return blobToFile(blobLower, file, fileType);
      }
      // Dernier recours : qualité minimale
      const blobMin = await canvasToBlob(canvas, fileType, 0.6);
      if (blobMin) return blobToFile(blobMin, file, fileType);
    }

    return blobToFile(blob, file, fileType);
  } finally {
    // Libère le bitmap (pas dispo partout mais permet d'économiser RAM sur Chrome).
    if ('close' in bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Helpers privés
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Décode un fichier image en `ImageBitmap` (rapide + WebP/AVIF supportés).
 * Fallback en `<img>` + drawImage si OffscreenCanvas n'est pas dispo.
 */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Certains formats exotiques (GIF animés) échouent en ImageBitmap → fallback.
    }
  }
  return await decodeViaHTMLImage(file);
}

function decodeViaHTMLImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Calcule les nouvelles dimensions en respectant le ratio et dessine sur
 * un OffscreenCanvas (avec fallback canvas 2D).
 */
function drawResized(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
): { canvas: OffscreenCanvas | HTMLCanvasElement; width: number; height: number } {
  const ratio = Math.min(
    1,
    maxSide / Math.max(source.width, source.height),
  );
  const width = Math.round(source.width * ratio);
  const height = Math.round(source.height * ratio);

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
    }
    return { canvas, width, height };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  }
  return { canvas, width, height };
}

async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  fileType: string,
  quality: number,
): Promise<Blob | null> {
  if ('convertToBlob' in canvas && typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
    try {
      return await (canvas as OffscreenCanvas).convertToBlob({ type: fileType, quality });
    } catch {
      // Certains types ne sont pas supportés (ex. Safari iOS < 16 et WebP)
    }
  }
  // Fallback : canvas 2D HTML (toujours dispo côté client).
  return new Promise((resolve) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b: Blob | null) => resolve(b),
      fileType,
      quality,
    );
  });
}

function blobToFile(blob: Blob, original: File, fileType: string): File {
  const baseName = original.name.replace(/\.[^.]+$/, '');
  const ext = fileType === 'image/webp' ? 'webp'
            : fileType === 'image/jpeg' ? 'jpg'
            : original.name.split('.').pop() ?? 'bin';
  return new File([blob], `${baseName}.${ext}`, {
    type: fileType,
    lastModified: Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Info de compression — utile pour l'UI "économie"
// ─────────────────────────────────────────────────────────────────────────────

export interface CompressionInfo {
  original: number;
  compressed: number;
  ratio: number; // % d'économie (0–100)
}

export function computeCompressionInfo(originalBytes: number, compressedBytes: number): CompressionInfo {
  if (originalBytes <= 0) return { original: originalBytes, compressed: compressedBytes, ratio: 0 };
  const ratio = Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100));
  return { original: originalBytes, compressed: compressedBytes, ratio };
}

export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
