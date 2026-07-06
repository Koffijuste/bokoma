// hooks/usePaymentNotifications.ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

export interface PaymentNotification {
  _id: string;
  type: 'payment_pending' | 'payment_success' | 'payment_failed' | 'payment_expired' | 'payment_reminder';
  title: string;
  message: string;
  data?: {
    orderId?: string;
    orderNumber?: string;
    amount?: number;
  };
  isRead: boolean;
  createdAt: string;
}

interface UsePaymentNotificationsReturn {
  notifications: PaymentNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
  isLoading: boolean;
}

export function usePaymentNotifications(
  enabled: boolean = true,
  pollingInterval: number = 30_000
): UsePaymentNotificationsReturn {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const shownToasts = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    try {
      setIsLoading(true);

      // ✅ URL corrigée : /payments/notifications (plus /notifications/payments)
      const response = await apiClient.get('/payments/notifications', {
        params: { limit: 20 },
        signal: AbortSignal.timeout(10_000),
      });

      const data     = response?.data?.notifications ?? response?.data ?? [];
      const notifList: PaymentNotification[] = Array.isArray(data) ? data : [];

      // Toast pour les nouvelles notifications non lues
      const ICONS: Record<string, string> = {
        payment_success:  '✅',
        payment_failed:   '❌',
        payment_pending:  '⏳',
        payment_expired:  '⏰',
        payment_reminder: '⚠️',
      };

      notifList.forEach(n => {
        if (!n.isRead && !shownToasts.current.has(n._id)) {
          shownToasts.current.add(n._id);
          toast(`${ICONS[n.type] ?? '🔔'} ${n.title}`, {
            description: n.message,
            duration: 6_000,
          });
        }
      });

      setNotifications(notifList);
    } catch {
      // Silent fail — polling
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // ✅ URL corrigée : /payments/notifications/:id/read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/payments/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('❌ markAsRead error:', err);
    }
  }, []);

  // ✅ URL corrigée : /payments/notifications/mark-all-read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch('/payments/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, pollingInterval);
    return () => clearInterval(id);
  }, [enabled, pollingInterval, fetchNotifications]);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    isLoading,
  };
}