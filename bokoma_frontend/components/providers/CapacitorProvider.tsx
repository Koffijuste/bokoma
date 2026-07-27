// components/providers/CapacitorProvider.tsx
// ============================================================================
// 📱 CAPACITOR PROVIDER — Initialise les plugins natifs au démarrage
// ============================================================================
// Sur le web, ce composant est un no-op (children = children).
// Sur Android/iOS, il :
//   1. Configure la StatusBar (style + couleur)
//   2. Cache la SplashScreen dès que React est monté
//   3. Active le plugin Keyboard (resize automatique, dark theme)
//   4. Active le plugin Network (pour afficher un bandeau offline plus tard)
//   5. Écoute les événements App (back button Android, deep links)
//   6. Prépare les Push Notifications (iOS demande la perm à l'init)
//
// Tout est lazy-importé → la version web ne télécharge jamais les
// bundles des plugins natifs (ils ne sont pas utilisés sur le web).
// ============================================================================
'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// ─── Détection runtime de Capacitor ─────────────────────────────────────────
// On importe @capacitor/core UNIQUEMENT côté client. Sur le web (SSR), on
// retourne `false` et on n'importe rien → zero impact sur le bundle web.
function useIsCapacitor(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // window.Capacitor est injecté par le bridge natif au runtime mobile.
    // On évite l'import dynamique de @capacitor/core ici → on regarde juste
    // si l'objet global existe (c'est la méthode recommandée par les
    // docs Capacitor pour détecter un contexte natif).
    // @ts-ignore
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
      // @ts-ignore
      setIsNative(window.Capacitor.isNativePlatform());
    }
  }, []);

  return isNative;
}

export function CapacitorProvider({ children }: { children: ReactNode }) {
  const isCapacitor = useIsCapacitor();

  // ── Init plugins natifs (une seule fois au mount) ────────────────────────
  useEffect(() => {
    if (!isCapacitor) return; // Web : no-op total

    let cancelled = false;

    (async () => {
      try {
        // Imports dynamiques : ne sont jamais bundlés sur le web
        const [
          { StatusBar, Style },
          { SplashScreen },
          { Keyboard },
          { Network },
          { App },
          { PushNotifications },
          { ScreenOrientation },
          { Haptics, ImpactStyle },
        ] = await Promise.all([
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/keyboard'),
          import('@capacitor/network'),
          import('@capacitor/app'),
          import('@capacitor/push-notifications'),
          import('@capacitor/screen-orientation'),
          import('@capacitor/haptics'),
        ]);

        if (cancelled) return;

        // ── StatusBar ─────────────────────────────────────────────────────
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
          // iOS ne supporte pas setOverlaysWebView → on ignore
          console.warn('[Capacitor] StatusBar init:', e);
        }

        // ── SplashScreen ──────────────────────────────────────────────────
        // On la cache dès que React a fait son 1er render (sinon elle reste
        // jusqu'à launchShowDuration). On attend 1 tick pour laisser le
        // CSS charger.
        setTimeout(() => {
          SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
        }, 100);

        // ── Keyboard : ajustement auto de la WebView ──────────────────────
        try {
          const { KeyboardResize, KeyboardStyle } = await import(
            '@capacitor/keyboard'
          );
          await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
          await Keyboard.setStyle({ style: KeyboardStyle.Dark });
          await Keyboard.setScroll({ isDisabled: false });
        } catch (e) {
          console.warn('[Capacitor] Keyboard init:', e);
        }

        // ── Network : prépare l'event listener (utilisé par hooks/useNetwork) ──
        try {
          // Status initial
          const status = await Network.getStatus();
          window.dispatchEvent(
            new CustomEvent('bokoma:network-status', { detail: status })
          );
          // Listeners live
          Network.addListener('networkStatusChange', (status) => {
            window.dispatchEvent(
              new CustomEvent('bokoma:network-status', { detail: status })
            );
          });
        } catch (e) {
          console.warn('[Capacitor] Network init:', e);
        }

        // ── App : back button Android + deep links ────────────────────────
        App.addListener('backButton', ({ canGoBack }) => {
          // Laisse Next.js gérer le back si possible (navigation interne)
          if (canGoBack) {
            window.history.back();
          } else {
            // Sinon, demande à Android de quitter (UX native)
            App.exitApp().catch(() => {});
          }
        });

        App.addListener('appUrlOpen', ({ url }) => {
          // Deep link entrant (ex: bokoma://orders/123 ou https://bokoma.store/...)
          // On extrait le path et on route avec Next.js router.
          try {
            const path = new URL(url).pathname + new URL(url).search;
            window.history.replaceState({}, '', path);
            // Déclenche un popstate pour que Next.js router reagisse
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (e) {
            console.warn('[Capacitor] deep link parse:', e);
          }
        });

        // ── Push Notifications (préparation — pas de registration auto) ──
        // On ne demande PAS la permission d'emblée. Le composant
        // NotificationPermissionToggle s'en charge sur action user.
        // On écoute juste l'événement de registration pour pouvoir
        // forwarder le token au backend plus tard.
        PushNotifications.addListener('registration', (token) => {
          window.dispatchEvent(
            new CustomEvent('bokoma:push-token', { detail: token.value })
          );
        });
        PushNotifications.addListener('registrationError', (err) => {
          console.warn('[Capacitor] Push registration error:', err);
        });
        PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            // La notif a été reçue en foreground → on la forwarde à
            // tes hooks (usePaymentNotifications, etc.)
            window.dispatchEvent(
              new CustomEvent('bokoma:push-received', { detail: notification })
            );
          }
        );
        PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (notification) => {
            // L'user a tapé la notif → on navigue vers l'URL
            const url = notification.notification.data?.url;
            if (typeof url === 'string') {
              window.history.replaceState({}, '', url);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }
        );

        // ── Screen Orientation : on autorise portrait + landscape ────────
        try {
          await ScreenOrientation.lock({ orientation: 'portrait' });
          // Si l'user tourne son tél → on unlock pour pas le bloquer
          ScreenOrientation.addListener('screenOrientationChange', () => {});
        } catch (e) {
          // iOS n'autorise pas le lock programmatique sans UIRequired
          console.warn('[Capacitor] ScreenOrientation:', e);
        }

        // Expose Haptics globalement pour les composants (panier, validation…)
        // (ex: <button onClick={() => window.Haptics?.impact()}>)
        const { NotificationType } = await import('@capacitor/haptics');
        // @ts-ignore
        window.Haptics = {
          impact: (style: 'light' | 'medium' | 'heavy' = 'light') =>
            Haptics.impact({
              style:
                style === 'light'
                  ? ImpactStyle.Light
                  : style === 'medium'
                    ? ImpactStyle.Medium
                    : ImpactStyle.Heavy,
            }).catch(() => {}),
          notification: (type: 'success' | 'warning' | 'error' = 'success') =>
            Haptics.notification({
              type:
                type === 'success'
                  ? NotificationType.Success
                  : type === 'warning'
                    ? NotificationType.Warning
                    : NotificationType.Error,
            }).catch(() => {}),
          vibrate: () => Haptics.vibrate().catch(() => {}),
        };
      } catch (err) {
        console.error('[Capacitor] init failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCapacitor]);

  // ── Track pathname changes → feedback haptique léger sur tab change ────
  const pathname = usePathname();
  useEffect(() => {
    if (!isCapacitor) return;
    // Petit feedback haptique lors d'une navigation entre pages
    // (désactivable si trop intrusif : commenter la ligne ci-dessous)
    // @ts-ignore
    window.Haptics?.impact('light');
  }, [pathname, isCapacitor]);

  return <>{children}</>;
}
