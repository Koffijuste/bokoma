// components/features/ProductReviews/index.tsx
// ============================================================================
// ⭐ PRODUCT REVIEWS — Liste publique des avis approuvés par l'admin
// ============================================================================
'use client';

import React, { useEffect, useState } from 'react';
import { Star, Loader2, MessageSquare, ThumbsUp, User as UserIcon } from 'lucide-react';
import { reviewApi } from '@/services';
import { formatDate, cn } from '@/utils/helpers';

interface PublicReviewUser {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface PublicReview {
  _id: string;
  rating: number;
  title?: string;
  body: string;
  isHelpful?: number;
  createdAt: string;
  user: PublicReviewUser;
}

interface ProductReviewsProps {
  productId: string;
  className?: string;
}

const getAvatarUrl = (user: PublicReviewUser): string => {
  if (user.avatar) return user.avatar;
  const name = `${user.firstName || ''}${user.lastName || ''}`.trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=a855f7&color=fff&size=64`;
};

const StarRating = React.memo(function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} étoiles sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn(sz, i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
        />
      ))}
    </div>
  );
});

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, className }) => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await reviewApi.getProductReviews(productId, { limit: 20 });
        // Backend returns { success, data: { reviews, total, pagination } }
        const payload = (resp as any)?.data ?? resp ?? {};
        const list: PublicReview[] = Array.isArray(payload.reviews) ? payload.reviews : [];
        if (!cancelled) setReviews(list);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Impossible de charger les avis');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [productId]);

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <section className={cn('mt-16 border-t border-border pt-12', className)}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Avis des clients
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seuls les avis validés par notre équipe sont affichés ici.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-muted/30 border border-border">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Aucun avis validé pour ce produit</p>
          <p className="text-sm text-muted-foreground mt-1">
            Soyez le premier à donner votre avis après votre achat.
          </p>
        </div>
      ) : (
        <>
          {/* Résumé */}
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 mb-8 p-6 rounded-2xl bg-card border border-border">
            <div className="text-center sm:text-left">
              <div className="text-5xl font-bold text-accent">{averageRating.toFixed(1)}</div>
              <StarRating rating={Math.round(averageRating)} size="md" />
              <p className="text-xs text-muted-foreground mt-1">
                Basé sur {reviews.length} avis
              </p>
            </div>
            <div className="space-y-1.5">
              {distribution.map(({ star, count }) => {
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted-foreground tabular-nums">{star}★</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liste des avis */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <article
                key={review._id}
                className="p-5 rounded-2xl border border-border bg-card hover:border-accent/40 transition"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={getAvatarUrl(review.user)}
                    alt={`${review.user.firstName} ${review.user.lastName}`}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getAvatarUrl({
                        _id: '',
                        firstName: review.user.firstName?.[0] || 'U',
                        lastName: '',
                      });
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {review.user.firstName} {review.user.lastName?.[0] || ''}.
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <StarRating rating={review.rating} />
                    </div>
                  </div>
                </div>

                {review.title && (
                  <h4 className="font-semibold mb-1">{review.title}</h4>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {review.body}
                </p>

                {typeof review.isHelpful === 'number' && review.isHelpful > 0 && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{review.isHelpful} personne{review.isHelpful > 1 ? 's ont' : ' a'} trouvé cela utile</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default ProductReviews;