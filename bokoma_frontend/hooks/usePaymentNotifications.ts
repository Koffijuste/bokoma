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
  pollingInterval: number = 30000
): UsePaymentNotificationsReturn {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const shownToasts = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.get('/notifications/payments', {
        params: { limit: 20 },
        signal: AbortSignal.timeout(10000),
      });

      const data = response?.data?.notifications || response?.data || [];
      const notifList = Array.isArray(data) ? data : [];
      
      // 🔔 Toast pour les nouvelles notifications
      notifList.forEach((notif: PaymentNotification) => {
        if (!notif.isRead && !shownToasts.current.has(notif._id)) {
          shownToasts.current.add(notif._id);
          
          const icons = {
            payment_success: '✅',
            payment_failed: '❌',
            payment_pending: '⏳',
            payment_expired: '⏰',
            payment_reminder: '⚠️',
          };
          
          toast(`${icons[notif.type] || '🔔'} ${notif.title}`, {
            description: notif.message,
            duration: 6000,
          });
        }
      });

      setNotifications(notifList);
    } catch (err) {
      // Silent fail pour le polling
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('❌ Mark as read error:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollingInterval);
    
    return () => clearInterval(interval);
  }, [enabled, pollingInterval, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    isLoading,
  };
}