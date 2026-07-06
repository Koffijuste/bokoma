// app/(admin)/dashboard/reviews/page.tsx
// ============================================================================
// ⭐ ADMIN — Modération des avis produits
// ============================================================================
// Optimisé : zéro framer-motion — animations 100% CSS (staggerChidren + hover-lift).
// Réduction bundle : ~-30 kB gzip sur cette route.
// ============================================================================
'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Star, Trash2, CheckCircle2, XCircle, MessageSquare, RefreshCw, User as UserIcon,
  Calendar, Package, Search, ExternalLink, Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatDate } from '@/utils/helpers';
import { toast } from 'sonner';

import { reviewApi, type AdminReviewStats } from '@/services';
import {
  AdminHeader, AdminStats, AdminFilters, StaggerList, EmptyState, StatusPill,
  ErrorBanner, InlineSpinner, PaginationBar, IconBadge,
} from '@/components/admin/admin-shell';

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Types locaux
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewProductImage { url: string }
type ReviewImageRef = ReviewProductImage | string;

interface Review {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug?: string;
    images?: ReviewImageRef[];
  };
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  rating: number;
  title?: string;
  body: string;
  isApproved: boolean;
  isHelpful?: number;
  images?: ReviewImageRef[];
  createdAt: string;
}

type FilterType = 'all' | 'pending' | 'approved';

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const getFirstImageUrl = (imgs: ReviewImageRef[] | undefined): string | null => {
  if (!imgs || imgs.length === 0) return null;
  const first = imgs[0];
  return typeof first === 'string' ? first : first?.url ?? null;
};

const isHttpUrl = (u: string): boolean =>
  u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/uploads/');

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Composant StarRating (mémoïsé, zéro JS d'animation)
// ─────────────────────────────────────────────────────────────────────────────

const StarRating = React.memo(function StarRating({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sz = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }[size];
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} étoiles sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`${sz} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'}`}
        />
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Composant ReviewCard (mémoïsé)
// ─────────────────────────────────────────────────────────────────────────────

const ReviewCard = React.memo(function ReviewCard({
  review,
  onApprove,
  onReject,
  onDelete,
  updating,
}: {
  review: Review;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (review: Review) => void;
  updating: string | null;
}) {
  const isUpdating = updating === review._id;
  const productImage = getFirstImageUrl(review.product?.images);
  const hasProductImage = productImage && isHttpUrl(productImage);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200 hover-lift ${
        review.isApproved
          ? 'border-border hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5'
          : 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-lg hover:shadow-amber-500/5'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
            {hasProductImage ? (
              <Image
                src={productImage}
                alt={review.product.name}
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground/40" />
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
                  aria-label="Voir le produit"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-xs text-muted-foreground tabular-nums">{review.rating}/5</span>
            </div>
          </div>
        </div>

        <StatusPill variant={review.isApproved ? 'approved' : 'pending'} />
      </div>

      {/* Body */}
      {(review.title || review.body) && (
        <div className="mb-4">
          {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {review.body}
          </p>
        </div>
      )}

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          {review.images.slice(0, 5).map((img, idx) => {
            const url = typeof img === 'string' ? img : img.url;
            if (!isHttpUrl(url)) return null;
            return (
              <div
                key={idx}
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border hover:ring-accent transition-all"
              >
                <Image
                  src={url}
                  alt={`Image ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            {review.user.avatar && isHttpUrl(review.user.avatar) ? (
              <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-border">
                <Image
                  src={review.user.avatar}
                  alt={`${review.user.firstName} ${review.user.lastName}`}
                  fill
                  sizes="24px"
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
              </div>
            ) : (
              <IconBadge icon={UserIcon} color="accent" size="sm" className="!w-6 !h-6 [&_svg]:!w-3 [&_svg]:!h-3" />
            )}
            <span className="font-medium text-foreground">
              {review.user.firstName} {review.user.lastName}
            </span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(review.createdAt)}
          </span>
          {typeof review.isHelpful === 'number' && review.isHelpful > 0 && (
            <>
              <span className="text-border">•</span>
              <span className="flex items-center gap-0.5">
                <span>👍</span>
                <span className="tabular-nums">{review.isHelpful}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {review.isApproved ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(review._id)}
              disabled={isUpdating}
              className="gap-1.5 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              {isUpdating ? <InlineSpinner /> : <XCircle className="w-3.5 h-3.5" />}
              Rejeter
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApprove(review._id)}
              disabled={isUpdating}
              className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              {isUpdating ? <InlineSpinner /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approuver
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(review)}
            disabled={isUpdating}
            className="gap-1.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
          >
            {isUpdating ? <InlineSpinner /> : <Trash2 className="w-3.5 h-3.5" />}
            Supprimer
          </Button>
        </div>
      </div>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Page principale
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewsAdminPage() {
  useRequireAdmin();

  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [search, setSearch] = React.useState('');
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<AdminReviewStats | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Review | null>(null);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({ total: 0, pages: 1 });

  // Reset page on filter change
  React.useEffect(() => { setPage(1); }, [filter]);

  const fetchReviews = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
        ...(filter === 'pending' ? { approved: false } : {}),
        ...(filter === 'approved' ? { approved: true } : {}),
      };
      const [listResp, statsResp] = await Promise.all([
        reviewApi.adminList(params),
        page === 1 ? reviewApi.adminStats() : Promise.resolve(null),
      ]);

      // ✅ Lecture défensive : le backend peut renvoyer `{ data: { reviews, pagination } }`
      //    OU `{ reviews, pagination }` directement. On tolère les deux formats.
      const payload = (listResp as any)?.data ?? listResp ?? {};
      const list: Review[] = Array.isArray(payload.reviews) ? payload.reviews : [];
      const pagination = payload.pagination ?? {};
      setReviews(list);
      setPagination({
        total: pagination.total ?? list.length,
        pages: pagination.pages ?? 1,
      });

      // ✅ Stats : idem, on extrait `data` si l'API renvoie la forme ApiResponse.
      const statsPayload = (statsResp as any)?.data ?? statsResp;
      if (statsPayload && typeof statsPayload === 'object' && 'totalReviews' in statsPayload) {
        setStats(statsPayload as AdminReviewStats);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur de chargement';
      setError(msg);
      toast.error(msg);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  React.useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Stats fallback si l'API stats échoue
  const displayStats = React.useMemo(() => {
    if (stats) return stats;
    const total = reviews.length;
    const approved = reviews.filter((r) => r.isApproved).length;
    return {
      totalReviews: total,
      approvedCount: approved,
      pendingCount: total - approved,
      averageRating: total > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / total
        : 0,
    };
  }, [reviews, stats]);

  // Recherche locale
  const filteredReviews = React.useMemo(() => {
    if (!search.trim()) return reviews;
    const q = search.toLowerCase().trim();
    return reviews.filter((r) =>
      r.product?.name?.toLowerCase().includes(q) ||
      r.user?.firstName?.toLowerCase().includes(q) ||
      r.user?.lastName?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.body?.toLowerCase().includes(q),
    );
  }, [reviews, search]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = React.useCallback(async (id: string) => {
    if (updating) return;
    setUpdating(id);
    try {
      await reviewApi.approveReview(id);
      setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, isApproved: true } : r)));
      toast.success('Avis approuvé');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setUpdating(null);
    }
  }, [updating]);

  const handleReject = React.useCallback(async (id: string) => {
    if (updating) return;
    setUpdating(id);
    try {
      await reviewApi.rejectReview(id);
      setReviews((prev) => prev.filter((r) => r._id !== id));
      toast.success('Avis rejeté');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setUpdating(null);
    }
  }, [updating]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || updating) return;
    setUpdating(deleteTarget._id);
    try {
      await reviewApi.deleteReview(deleteTarget._id);
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      toast.success('Avis supprimé');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setUpdating(null);
    }
  }, [deleteTarget, updating]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <AdminHeader
        title="Gestion des Avis"
        description="Modérez les avis clients et maintenez la qualité du catalogue."
        icon={<MessageSquare />}
        actions={
          <Button
            variant="outline"
            onClick={fetchReviews}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        }
      />

      <AdminStats
        stats={[
          { label: 'Total avis', value: displayStats.totalReviews, icon: MessageSquare },
          { label: 'En attente', value: displayStats.pendingCount, icon: Eye, accent: 'amber' },
          { label: 'Approuvés', value: displayStats.approvedCount, icon: CheckCircle2, accent: 'green' },
          {
            label: 'Note moyenne',
            value: displayStats.averageRating.toFixed(1),
            icon: Star,
            accent: 'accent',
            suffix: <StarRating rating={Math.round(displayStats.averageRating)} size="sm" />,
          },
        ]}
      />

      {error && <ErrorBanner message={error} onRetry={fetchReviews} />}

      <AdminFilters
        search={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par produit, auteur, contenu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Effacer la recherche"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        }
        chips={[
          { key: 'all', label: 'Tous', count: displayStats.totalReviews, active: filter === 'all', onClick: () => setFilter('all') },
          { key: 'pending', label: 'En attente', count: displayStats.pendingCount, active: filter === 'pending', onClick: () => setFilter('pending'), accent: 'amber' },
          { key: 'approved', label: 'Approuvés', count: displayStats.approvedCount, active: filter === 'approved', onClick: () => setFilter('approved'), accent: 'green' },
        ]}
      />

      <StaggerList
        items={filteredReviews}
        getKey={(r) => r._id}
        loading={loading}
        loadingCount={3}
        emptyState={
          <EmptyState
            icon={MessageSquare}
            title="Aucun avis trouvé"
            description={
              search || filter !== 'all'
                ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                : 'Les avis clients apparaîtront ici dès qu\'ils seront soumis.'
            }
          />
        }
        render={(review) => (
          <ReviewCard
            review={review}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={setDeleteTarget}
            updating={updating}
          />
        )}
      />

      {!loading && filteredReviews.length > 0 && (
        <PaginationBar
          page={page}
          pages={pagination.pages || 1}
          total={pagination.total}
          suffix="avis au total"
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
          disabled={loading}
        />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmer la suppression"
        description="Cette action est irréversible."
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={!!updating}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!!updating}
              isLoading={!!updating}
            >
              Supprimer définitivement
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-rose-700 dark:text-rose-400 mb-1">
                Supprimer cet avis ?
              </p>
              <p className="text-muted-foreground">
                L'avis de{' '}
                <strong className="text-foreground">
                  {deleteTarget.user.firstName} {deleteTarget.user.lastName}
                </strong>{' '}
                sur <strong className="text-foreground">{deleteTarget.product.name}</strong> sera
                définitivement supprimé.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
