'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useFetch } from '@/hooks';
import { orderApi } from '@/services';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/utils/helpers';

export default function OrdersPage() {
  const { data, loading, error, refetch } = useFetch(
    () => orderApi.getMyOrders({ page: 1, limit: 10 }),
    []
  );

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Mes Commandes</h1>
          <p className="text-muted-foreground">Suivez l'état de vos achats.</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-3xl bg-card animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive bg-destructive/10 p-8 text-center text-destructive">
            <p className="mb-4">Erreur: {error.message}</p>
            <Button onClick={() => refetch()}>Réessayer</Button>
          </div>
        ) : data?.data?.length ? (
          <div className="space-y-4">
            {data.data.map((order) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Commande #{order.orderNumber}</p>
                    <h2 className="text-xl font-semibold mt-1">{formatDate(order.createdAt)}</h2>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-lg font-bold">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                      {order.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Articles</p>
                    <p className="font-medium">{order.items.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="font-medium">{order.shipping.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <h2 className="text-2xl font-semibold mb-3">Aucune commande trouvée</h2>
            <p className="text-muted-foreground mb-6">
              Vous n'avez pas encore passé de commande.
            </p>
            <Button onClick={() => refetch()}>Recharger</Button>
          </div>
        )}
      </div>
    </div>
  );
}
