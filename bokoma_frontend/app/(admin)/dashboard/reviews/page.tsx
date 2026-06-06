'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRequireAdmin } from '@/hooks/useAuth';

export default function ReviewsAdminPage() {
  useRequireAdmin();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // Mock data - à remplacer par l'appel API réel
      const mockReviews = [
        {
          _id: '1',
          product: { name: 'Produit A', _id: '1' },
          user: { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' },
          rating: 5,
          title: 'Excellent produit !',
          body: 'Le produit est conforme à la description et la qualité est excellente.',
          isApproved: true,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          product: { name: 'Produit B', _id: '2' },
          user: { firstName: 'Marie', lastName: 'Martin', email: 'marie@example.com' },
          rating: 3,
          title: 'Bon mais avec des défauts',
          body: 'Le produit fonctionne bien mais il y a quelques défauts mineurs.',
          isApproved: false,
          createdAt: new Date().toISOString(),
        },
      ];
      setReviews(mockReviews);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des avis');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setReviews(reviews.map(r => 
        r._id === id ? { ...r, isApproved: true } : r
      ));
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (id: string) => {
    try {
      setReviews(reviews.map(r => 
        r._id === id ? { ...r, isApproved: false } : r
      ));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du rejet');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;
    try {
      setReviews(reviews.filter(r => r._id !== id));
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true;
  });

  return (
    <div className="p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des Avis</h1>
          <p className="text-muted-foreground">
            Modérez et gérez les avis clients
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Tous ({reviews.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'primary' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          En attente ({reviews.filter(r => !r.isApproved).length})
        </Button>
        <Button
          variant={filter === 'approved' ? 'primary' : 'outline'}
          onClick={() => setFilter('approved')}
        >
          Approuvés ({reviews.filter(r => r.isApproved).length})
        </Button>
      </div>

      {/* Reviews Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun avis trouvé
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review._id}
              className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{review.product.name}</h3>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'fill-accent text-accent'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Par {review.user.firstName} {review.user.lastName} ({review.user.email})
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  review.isApproved
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {review.isApproved ? 'Approuvé' : 'En attente'}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-1">{review.title}</h4>
                <p className="text-sm text-muted-foreground">{review.body}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                {new Date(review.createdAt).toLocaleDateString('fr-FR')}
              </div>

              <div className="flex gap-2">
                {!review.isApproved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(review._id)}
                    className="gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approuver
                  </Button>
                )}
                {review.isApproved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(review._id)}
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(review._id)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          ))
        )}
      </motion.div>
    </div>
  );
}
