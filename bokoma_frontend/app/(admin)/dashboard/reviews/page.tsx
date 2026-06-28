// app/(admin)/dashboard/reviews/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, Trash2, CheckCircle2, XCircle, MessageSquare,
  Loader2, AlertCircle, RefreshCw, User as UserIcon,
  Calendar, Package, Search, ExternalLink, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { reviewApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatDate } from '@/utils/helpers';
import { toast } from 'sonner';

interface Review {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug?: string;
    images?: Array<{ url: string } | string>;
  };
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  rating: number;
  title: string;
  body: string;
  isApproved: boolean;
  isHelpful?: number;
  images?: Array<{ url: string } | string>;
  createdAt: string;
  updatedAt?: string;
}

interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  averageRating: number;
}

type FilterType = 'all' | 'pending' | 'approved';

const StarRating = React.memo(({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} étoiles sur 5`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${sizeClasses[size]} ${
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
});
StarRating.displayName = 'StarRating';

const ReviewCard = React.memo(({
  review,
  onApprove,
  onReject,
  onDelete,
  updating,
  index,
}: {
  review: Review;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  updating: string | null;
  index: number;
}) => {
  const isUpdating = updating === review._id;

  const getProductImage = useMemo((): string | null => {
    if (!review.product?.images || review.product.images.length === 0) return null;
    const img = review.product.images[0];
    return typeof img === 'string' ? img : img?.url || null;
  }, [review.product?.images]);

  const getReviewImageUrl = (img: { url: string } | string): string => {
    return typeof img === 'string' ? img : img.url;
  };

  return (
    <div
      className={`bg-card border rounded-xl p-5 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        review.isApproved
          ? 'border-border hover:border-green-500/30'
          : 'border-amber-500/30 bg-amber-500/5'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {getProductImage ? (
              <img
                src={getProductImage}
                alt={review.product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{review.product.name}</h3>
              {review.product.slug && (
                <a
                  href={`/products/${review.product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-muted-foreground hover:text-accent transition-colors"
                  title="Voir le produit"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-xs text-muted-foreground">
                {review.rating}/5
              </span>
            </div>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
          review.isApproved
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        }`}>
          {review.isApproved ? '✓ Approuvé' : '⏳ En attente'}
        </span>
      </div>

      <div className="mb-4">
        {review.title && (
          <h4 className="font-medium mb-1">{review.title}</h4>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {review.body}
        </p>
      </div>

      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {review.images.map((img, idx) => (
            <div
              key={idx}
              className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 hover:ring-2 hover:ring-accent transition-all cursor-pointer"
            >
              <img
                src={getReviewImageUrl(img)}
                alt={`Image ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            {review.user.avatar ? (
              <img
                src={review.user.avatar}
                alt={`${review.user.firstName} ${review.user.lastName}`}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-accent" />
              </div>
            )}
            <span className="font-medium">
              {review.user.firstName} {review.user.lastName}
            </span>
          </div>

          <span className="hidden sm:inline text-muted-foreground/50">•</span>
          <a
            href={`mailto:${review.user.email}`}
            className="hidden sm:inline hover:text-accent transition-colors"
          >
            {review.user.email}
          </a>

          <span className="text-muted-foreground/50">•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(review.createdAt)}
          </span>

          {review.isHelpful !== undefined && review.isHelpful > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="flex items-center gap-0.5">
                <span>👍</span>
                <span>{review.isHelpful}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {!review.isApproved ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApprove(review._id)}
              disabled={isUpdating}
              className="gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10"
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approuver
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(review._id)}
              disabled={isUpdating}
              className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Rejeter
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(review._id)}
            disabled={isUpdating}
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
});
ReviewCard.displayName = 'ReviewCard';

const ReviewSkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-14 h-14 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/4" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-5/6" />
    </div>
    <div className="flex justify-between pt-4 border-t border-border">
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    </div>
  </div>
);

export default function ReviewsAdminPage() {
  useRequireAdmin();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Review | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        page: number;
        limit: number;
        approved?: boolean;
        sortBy: 'createdAt' | 'rating' | 'helpful';
        sortOrder: 'asc' | 'desc';
      } = {
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (filter === 'pending') params.approved = false;
      else if (filter === 'approved') params.approved = true;

      const [reviewsResponse, statsResponse] = await Promise.allSettled([
        reviewApi.getAllReviews(params),
        reviewApi.getReviewStats?.(),
      ]);

      if (reviewsResponse.status === 'fulfilled') {
        const response = reviewsResponse.value;
        const data = (response as any)?.data || response;
        const reviewsList = data?.reviews || data?.data?.reviews || [];

        if (Array.isArray(reviewsList)) {
          setReviews(reviewsList);
        } else {
          setReviews([]);
        }
      } else {
        throw reviewsResponse.reason;
      }

      if (statsResponse.status === 'fulfilled') {
        const statsData = (statsResponse.value as any)?.data || statsResponse.value;
        const statsRaw = statsData?.data || statsData;

        if (statsRaw) {
          setStats({
            total: statsRaw.totalReviews || 0,
            approved: statsRaw.approvedCount || 0,
            pending: statsRaw.pendingCount || 0,
            averageRating: statsRaw.averageRating || 0,
          });
        }
      }
    } catch (err: any) {
      console.error('❌ [Reviews] Erreur:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Erreur lors du chargement des avis';
      setError(errorMessage);
      setReviews([]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const computedStats = useMemo<ReviewStats>(() => {
    if (stats) return stats;

    const total = reviews.length;
    const approved = reviews.filter(r => r.isApproved).length;
    const pending = total - approved;
    const averageRating = total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

    return { total, approved, pending, averageRating };
  }, [reviews, stats]);

  const filteredReviews = useMemo(() => {
    if (!search.trim()) return reviews;

    const searchLower = search.toLowerCase().trim();

    return reviews.filter(r => {
      return (
        r.product?.name?.toLowerCase().includes(searchLower) ||
        r.user?.firstName?.toLowerCase().includes(searchLower) ||
        r.user?.lastName?.toLowerCase().includes(searchLower) ||
        r.user?.email?.toLowerCase().includes(searchLower) ||
        r.title?.toLowerCase().includes(searchLower) ||
        r.body?.toLowerCase().includes(searchLower)
      );
    });
  }, [reviews, search]);

  const handleApprove = useCallback(async (id: string) => {
    if (updating) return;
    setUpdating(id);
    try {
      await reviewApi.approveReview(id);
      setReviews(prev => prev.map(r =>
        r._id === id ? { ...r, isApproved: true } : r
      ));
      toast.success('Avis approuvé avec succès');
    } catch (err: any) {
      console.error('❌ Approve error:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setUpdating(null);
    }
  }, [updating]);

  const handleReject = useCallback(async (id: string) => {
    if (updating) return;
    setUpdating(id);
    try {
      if (typeof (reviewApi as any).rejectReview === 'function') {
        await (reviewApi as any).rejectReview(id);
      } else {
        await reviewApi.deleteReview(id);
      }
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Avis rejeté avec succès');
    } catch (err: any) {
      console.error('❌ Reject error:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setUpdating(null);
    }
  }, [updating]);

  const handleDelete = useCallback(async (id: string) => {
    if (updating) return;
    setUpdating(id);
    try {
      await reviewApi.deleteReview(id);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Avis supprimé avec succès');
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setUpdating(null);
    }
  }, [updating]);

  const requestDelete = useCallback((id: string) => {
    const review = reviews.find(r => r._id === id);
    if (review) setDeleteConfirm(review);
  }, [reviews]);

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-accent" />
            Gestion des Avis
          </h1>
          <p className="text-muted-foreground">
            Modérez et gérez les avis clients
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchReviews}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total avis',
            value: computedStats.total,
            color: '',
            icon: MessageSquare,
          },
          {
            label: 'En attente',
            value: computedStats.pending,
            color: 'text-amber-600',
            icon: Eye,
          },
          {
            label: 'Approuvés',
            value: computedStats.approved,
            color: 'text-green-600',
            icon: CheckCircle2,
          },
          {
            label: 'Note moyenne',
            value: computedStats.averageRating.toFixed(1),
            color: '',
            icon: Star,
            suffix: <StarRating rating={Math.round(computedStats.averageRating)} size="sm" />,
          },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.suffix}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchReviews}
            className="text-destructive border-destructive/30"
          >
            Réessayer
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-card border border-border rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par produit, auteur, contenu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Tous ({computedStats.total})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          >
            En attente ({computedStats.pending})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
            className={filter === 'approved' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
          >
            Approuvés ({computedStats.approved})
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <ReviewSkeleton key={i} />
            ))}
          </>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border border-border rounded-xl animate-in fade-in zoom-in duration-300">
            <MessageSquare className="w-12 h-12 opacity-30 mb-3" />
            <p className="font-medium">Aucun avis trouvé</p>
            <p className="text-sm mt-1">
              {search || filter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Les avis clients apparaîtront ici'}
            </p>
          </div>
        ) : (
          <>
            {filteredReviews.map((review, index) => (
              <ReviewCard
                key={review._id}
                review={review}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={requestDelete}
                updating={updating}
                index={index}
              />
            ))}
          </>
        )}
      </div>

      {!loading && filteredReviews.length > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-6 animate-in fade-in duration-500 delay-300">
          {filteredReviews.length} avis affichés sur {computedStats.total}
          {search && ' (filtrés)'}
        </p>
      )}

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmer la suppression"
        description="Cette action est irréversible."
        size="md"
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">
                  Êtes-vous sûr de vouloir supprimer cet avis ?
                </p>
                <p className="text-muted-foreground">
                  L'avis de <strong>{deleteConfirm.user.firstName} {deleteConfirm.user.lastName}</strong> sur{' '}
                  <strong>{deleteConfirm.product.name}</strong> sera définitivement supprimé.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={updating === deleteConfirm._id}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm._id)}
                disabled={updating === deleteConfirm._id}
                className="gap-2"
              >
                {updating === deleteConfirm._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}