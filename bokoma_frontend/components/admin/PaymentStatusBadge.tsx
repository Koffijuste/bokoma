// components/admin/PaymentStatusBadge.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface PaymentStatusBadgeProps {
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'partial'; // ✅ Changé de 'success' à 'paid'
  createdAt?: string;
  expiresAt?: string;
  showTimer?: boolean;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  createdAt,
  expiresAt,
  showTimer = true,
  className,
}: PaymentStatusBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (status !== 'pending' || !showTimer) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = expiresAt 
        ? new Date(expiresAt).getTime() 
        : createdAt 
          ? new Date(createdAt).getTime() + 30 * 60 * 1000 
          : now + 30 * 60 * 1000;
      
      const diff = expiry - now;
      
      if (diff <= 0) {
        setTimeLeft('Expiré');
        return false;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      return true;
    };

    calculateTimeLeft();
    const interval = setInterval(() => {
      const shouldContinue = calculateTimeLeft();
      if (!shouldContinue) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, createdAt, expiresAt, showTimer]);

  const configs = {
    pending: {
      label: 'En attente',
      icon: Clock,
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      border: 'border-amber-500/30',
    },
    paid: { // ✅ Changé de 'success' à 'paid'
      label: 'Payé',
      icon: CheckCircle,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'border-emerald-500/30',
    },
    failed: {
      label: 'Échoué',
      icon: XCircle,
      bg: 'bg-red-500/10',
      text: 'text-red-600',
      border: 'border-red-500/30',
    },
    expired: {
      label: 'Expiré',
      icon: AlertTriangle,
      bg: 'bg-gray-500/10',
      text: 'text-gray-600',
      border: 'border-gray-500/30',
    },
    partial: {
      label: 'Partiel',
      icon: Clock,
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/30',
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      {status === 'pending' && showTimer && timeLeft && (
        <span className={cn(
          'font-mono font-bold ml-1 px-1.5 py-0.5 rounded',
          timeLeft === 'Expiré' ? 'bg-red-500/20 text-red-600' : 'bg-background/50'
        )}>
          {timeLeft}
        </span>
      )}
    </div>
  );
}