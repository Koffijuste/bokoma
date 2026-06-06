// components/ui/modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ isOpen, onClose, title, description, children, actions, size = 'lg' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Empêche le rendu côté serveur pour éviter l'erreur d'hydratation
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
          />

          {/* Container centré */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className={`${sizes[size]} w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}>
              {/* Header */}
              {(title || description) && (
                <div className="flex items-start justify-between px-6 py-4 border-b border-border">
                  <div>
                    {title && <h2 className="text-lg font-bold">{title}</h2>}
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                  </div>
                  <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto flex-1">
                {children}
              </div>

              {/* Actions */}
              {actions && (
                <div className="border-t border-border px-6 py-4 flex gap-2 justify-end bg-muted/30">
                  {actions}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}