// app/(admin)/dashboard/reviews/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Trash2, CheckCircle2, XCircle, MessageSquare, 
  Loader2, AlertCircle, RefreshCw, ImageIcon, User as UserIcon,
  Calendar, Package, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reviewApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatDate } from '@/utils/helpers';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// 🔹 TYPES
// ─────────────────────────────────────────────────────────────
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
  images?: Array<{ url: string }>;
  createdAt: string;
  updatedAt?: string;
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : StarRating
// ─────────────────────────────────────────────────────────────
const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-0.5">
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
};

// ─────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : ReviewCard
// ─────────────────────────────────────────────────────────────
const ReviewCard = ({ 
  review, 
  onApprove, 
  onReject, 
  onDelete,
  updating 
}: { 
  review: Review;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  updating: string | null;
}) => {
  const isUpdating = updating === review._id;
  
  const getProductImage = (): string | null => {
    if (!review.product?.images || review.product.images.length === 0) return null;
    const img = review.product.images[0];
    return typeof img === 'string' ? img : img?.url || null;
  };

  const imageUrl = getProductImage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-card border rounded-xl p-5 transition-all hover:shadow-md ${
        review.isApproved 
          ? 'border-border hover:border-green-500/30' 
          : 'border-amber-500/30 bg-amber-500/5'
      }`}
    >
      {/* Header : Produit + Note */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Image produit */}
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={review.product.name}
                className="w-full h-full object-cover"
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

          {/* Infos produit */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{review.product.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-xs text-muted-foreground">
                {review.rating}/5
              </span>
            </div>
          </div>
        </div>

        {/* Badge statut */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
          review.isApproved
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        }`}>
          {review.isApproved ? '✓ Approuvé' : '⏳ En attente'}
        </span>
      </div>

      {/* Contenu de l'avis */}
      <div className="mb-4">
        {review.title && (
          <h4 className="font-medium mb-1">{review.title}</h4>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {review.body}
        </p>
      </div>

      {/* Images de l'avis */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {review.images.map((img, idx) => (
            <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img
                src={typeof img === 'string' ? img : img.url}
                alt={`Image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer : Auteur + Date + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Auteur */}
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

          {/* Email */}
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{review.user.email}</span>

          {/* Date */}
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(review.createdAt)}
          </span>

          {/* Helpful */}
          {review.isHelpful !== undefined && review.isHelpful > 0 && (
            <>
              <span>•</span>
              <span>👍 {review.isHelpful}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
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
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🔹 PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ReviewsAdminPage() {
  useRequireAdmin();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // 🔹 FETCH
  // ─────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('⭐ [Reviews] Fetching reviews...');
      const params: any = { page: 1, limit: 100 };
      
      // ✅ Filtrer par statut si nécessaire
      if (filter === 'pending') params.approved = false;
      else if (filter === 'approved') params.approved = true;
      
      const response = await reviewApi.getReviews('', params);
      
      console.group('⭐ [Reviews] Parsing response');
      console.log('📥 Response complète:', response);
      
      // ✅ Navigation dans la structure imbriquée
      const responseData = (response as any)?.data || response;
      const reviewsData = responseData?.data || responseData;
      const reviewsList = reviewsData?.reviews || reviewsData || [];
      
      console.log('✅ Reviews extraites:', Array.isArray(reviewsList) ? reviewsList.length : 0);
      
      if (Array.isArray(reviewsList) && reviewsList.length > 0) {
        console.log('📋 Première review:', reviewsList[0]);
      }
      
      console.groupEnd();
      
      setReviews(Array.isArray(reviewsList) ? reviewsList : []);
      
    } catch (err: any) {
      console.error('❌ Error fetching reviews:', err);
      console.error('   Response:', err?.response?.data);
      setError(err?.response?.data?.message || err.message || 'Erreur lors du chargement des avis');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ─────────────────────────────────────────────────────────
  // 🔹 ACTIONS
  // ─────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setUpdating(id);
    try {
      await reviewApi.approveReview(id);
      setReviews(prev => prev.map(r => 
        r._id === id ? { ...r, isApproved: true } : r
      ));
      toast.success('Avis approuvé');
    } catch (err: any) {
      console.error('❌ Approve error:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (id: string) => {
    setUpdating(id);
    try {
      // On utilise delete pour "rejeter" ou un endpoint dédié si disponible
      await reviewApi.deleteReview(id);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Avis rejeté et supprimé');
    } catch (err: any) {
      console.error('❌ Reject error:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;
    
    setUpdating(id);
    try {
      await reviewApi.deleteReview(id);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Avis supprimé');
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setUpdating(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 🔹 FILTRAGE LOCAL
  // ─────────────────────────────────────────────────────────
  const filteredReviews = reviews.filter(r => {
    // Filtre par recherche
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        r.product?.name?.toLowerCase().includes(searchLower) ||
        r.user?.firstName?.toLowerCase().includes(searchLower) ||
        r.user?.lastName?.toLowerCase().includes(searchLower) ||
        r.user?.email?.toLowerCase().includes(searchLower) ||
        r.title?.toLowerCase().includes(searchLower) ||
        r.body?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Stats
  const pendingCount = reviews.filter(r => !r.isApproved).length;
  const approvedCount = reviews.filter(r => r.isApproved).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <div className="p-4 sm:p-8">
      {/* ═══════ HEADER ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8"
      >
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
      </motion.div>

      {/* ═══════ STATS ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <p className="text-xs text-muted-foreground mb-1">Total avis</p>
          <p className="text-2xl font-bold">{reviews.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <p className="text-xs text-muted-foreground mb-1">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <p className="text-xs text-muted-foreground mb-1">Approuvés</p>
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-4"
        >
          <p className="text-xs text-muted-foreground mb-1">Note moyenne</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{avgRating}</p>
            <StarRating rating={Math.round(parseFloat(avgRating))} size="sm" />
          </div>
        </motion.div>
      </div>

      {/* ═══════ ERREUR ═══════ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-3"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ FILTRES ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-card border border-border rounded-xl"
      >
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par produit, auteur, contenu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtres par statut */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Tous ({reviews.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            En attente ({pendingCount})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
            className={filter === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            Approuvés ({approvedCount})
          </Button>
        </div>
      </motion.div>

      {/* ═══════ LISTE DES AVIS ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-accent" />
            <p>Chargement des avis...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
            <MessageSquare className="w-12 h-12 opacity-30 mb-3" />
            <p className="font-medium">Aucun avis trouvé</p>
            <p className="text-sm mt-1">
              {search || filter !== 'all' 
                ? 'Essayez de modifier vos filtres'
                : 'Les avis clients apparaîtront ici'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                updating={updating}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Footer avec nombre de résultats */}
      {!loading && filteredReviews.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          {filteredReviews.length} avis affichés sur {reviews.length}
        </motion.p>
      )}
    </div>
  );
}