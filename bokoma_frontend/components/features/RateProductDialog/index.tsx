// components/features/RateProductDialog/index.tsx
// ============================================================================
// ⭐ NOTE PRODUIT — Modale rapide déclenchée après ajout au panier
// ============================================================================
// Pourquoi : on veut identifier les produits les plus demandés / appréciés.
// Quand : après chaque ajout au panier (sauf si l'utilisateur l'a déjà
//         notée ou s'il a skip).
// ============================================================================
'use client';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Star, Loader2, MessageSquare, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { reviewApi } from '@/services';

const NEVER_KEY = 'bokoma:rate-never';
const NEVER_COOLDOWN_DAYS = 7;

interface ProductLite {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  rating?: { average?: number; count?: number };
}

interface Props {
  open: boolean;
  product: ProductLite | null;
  onClose: () => void;
  onRated?: (productId: string) => void;
  onSkipped?: (productId: string) => void;
  onNeverAskAgain?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Helpers local-storage (cooldown "Ne plus me proposer")
// ─────────────────────────────────────────────────────────────────────────────

function writeNeverCooldown() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NEVER_KEY, String(Date.now()));
  } catch {
    /* silent */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Star input
// ─────────────────────────────────────────────────────────────────────────────

const StarRow = React.memo(function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div
      className="flex items-center justify-center gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          onMouseEnter={() => !disabled && setHover(n)}
          onFocus={() => !disabled && setHover(n)}
          onClick={() => !disabled && onChange(n)}
          className="p-1 rounded-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Star
            className={
              n <= active
                ? 'w-8 h-8 fill-amber-400 text-amber-400'
                : 'w-8 h-8 text-muted-foreground/40'
            }
          />
        </button>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function RateProductDialog({
  open,
  product,
  onClose,
  onRated,
  onSkipped,
  onNeverAskAgain,
}: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state à chaque ouverture
  useEffect(() => {
    if (open) {
      setRating(0);
      setComment('');
      setSubmitting(false);
    }
  }, [open, product?._id]);

  const handleSkip = useCallback(() => {
    if (product) onSkipped?.(product._id);
    onClose();
  }, [product, onSkipped, onClose]);

  const handleNeverAskAgain = useCallback(() => {
    writeNeverCooldown();
    onNeverAskAgain?.();
    onClose();
  }, [onNeverAskAgain, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!product || rating <= 0) return;

    setSubmitting(true);
    try {
      const payload = {
        rating,
        title: comment.trim().slice(0, 80) || `Note ${rating}/5`,
        body: comment.trim() || 'Aucune description fournie.',
      };

      await reviewApi.createReview(product.slug || product._id, payload as any);

      onRated?.(product._id);

      toast.success('Merci pour votre avis ! ⭐', {
        description: 'Cela aide les autres clients à choisir.',
      });
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Impossible d'enregistrer votre note.";
      toast.error('Oups', { description: msg });
    } finally {
      setSubmitting(false);
    }
  }, [product, rating, comment, onClose, onRated]);

  if (!product) return null;

  const image = product.image;
  const existingAvg = product.rating?.average ?? 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="md"
    >
      <div className="space-y-5 pt-2">
        {/* Header contextuel : produit ajouté */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider shrink-0">
            <ShoppingBag className="w-3.5 h-3.5" />
            Ajouté au panier
          </div>
          <p className="text-xs text-muted-foreground">
            Vos notes nous aident à mettre en avant les modèles les plus demandés.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover border border-border bg-muted"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-xs">
              IMG
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              Note actuelle :{' '}
              <span className="font-semibold text-foreground">
                {existingAvg.toFixed(1)}/5
              </span>
              {typeof product.rating?.count === 'number' && (
                <span> · {product.rating.count} avis</span>
              )}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-center mb-2">
            Comment avez-vous trouvé ce produit ?
          </p>
          <StarRow
            value={rating}
            onChange={setRating}
            disabled={submitting}
          />
          <p className="text-xs text-center text-muted-foreground mt-2">
            {rating === 0
              ? 'Touchez les étoiles pour noter'
              : rating === 5
                ? 'Excellent ⭐'
                : rating === 4
                  ? 'Très bien'
                  : rating === 3
                    ? 'Correct'
                    : rating === 2
                      ? 'Peut mieux faire'
                      : 'Décevant'}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Un mot sur ce modèle ? (optionnel)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Style, confort, taille, ce que vous avez aimé…"
            rows={3}
            maxLength={500}
            disabled={submitting}
          />
          <p className="text-[11px] text-muted-foreground text-right mt-1 tabular-nums">
            {comment.length} / 500
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleNeverAskAgain}
            disabled={submitting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline disabled:opacity-50"
          >
            Ne plus me proposer
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={submitting}
            >
              Plus tard
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || rating <= 0}
              isLoading={submitting}
              className="bg-gradient-to-r from-accent to-purple-500 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi…
                </>
              ) : (
                'Envoyer ma note'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
