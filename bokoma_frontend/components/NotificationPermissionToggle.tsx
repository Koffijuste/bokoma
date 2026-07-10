// components/NotificationPermissionToggle.tsx
// ============================================================================
// 🔔 TOGGLE "Activer les notifications" — UI pour le profile / settings
// ============================================================================
// 3 états visuels selon `pushStatus` :
//   - 'default' | 'denied' | 'unsupported' | 'error' → bouton "Activer"
//   - 'granted'                                 → bouton "Activer" (la subscription
//     n'est pas encore enregistrée)
//   - 'subscribed'                              → toggle activé + bouton "Désactiver"
//
// Après le 1er enable, l'API est persistée côté backend ET on n'a plus
// besoin de re-prompt (sauf si l'user uninstall / change de device).
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { toast } from 'sonner';
import { cn } from '@/utils/helpers';

export function NotificationPermissionToggle({ className }: { className?: string }) {
  const { pushStatus, subscribe, unsubscribe } = useServiceWorker();
  const [loading, setLoading] = useState(false);

  const isActive = pushStatus === 'subscribed';
  const isDenied = pushStatus === 'denied';
  const isUnsupported = pushStatus === 'unsupported';
  const isError = pushStatus === 'error';

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isActive) {
        // Désactiver
        const ok = await unsubscribe();
        if (ok) {
          toast.success('Notifications désactivées');
        } else {
          toast.error('Impossible de désactiver les notifications');
        }
      } else {
        // Activer
        if (isDenied) {
          toast.error(
            'Notifications bloquées par votre navigateur. Autorisez-les dans les paramètres du site.',
            { duration: 6000 },
          );
          return;
        }
        const sub = await subscribe();
        if (sub) {
          toast.success('🔔 Notifications activées ! Vous serez prévenu de chaque étape de vos commandes.');
        } else {
          toast.error('Impossible d\'activer les notifications. Réessayez plus tard.');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  // ── Affichage ─────────────────────────────────────────────────────
  if (isUnsupported) {
    return (
      <div className={cn('flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30', className)}>
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Votre navigateur ne supporte pas les notifications push.
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-xl border bg-card',
      isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border',
      className,
    )}>
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
        isActive ? 'bg-emerald-500/20 text-emerald-700' : 'bg-muted text-muted-foreground',
      )}>
        {isActive ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications de commande</h3>
          {isActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Activé
            </span>
          )}
          {isDenied && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-700">
              <AlertCircle className="w-3 h-3" /> Bloqué
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isActive
            ? 'Vous recevrez une notification à chaque étape : paiement, expédition, livraison.'
            : isDenied
              ? 'Activez-les dans les paramètres de votre navigateur pour recevoir les alertes de commande.'
              : 'Recevez une alerte à chaque étape : paiement, expédition, livraison.'}
        </p>
      </div>

      <Button
        size="sm"
        variant={isActive ? 'outline' : 'primary'}
        onClick={handleToggle}
        disabled={loading || (isUnsupported) || isError}
        className="flex-shrink-0"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isActive ? (
          <><BellOff className="w-4 h-4 mr-1.5" /> Désactiver</>
        ) : (
          <><Bell className="w-4 h-4 mr-1.5" /> Activer</>
        )}
      </Button>
    </div>
  );
}
