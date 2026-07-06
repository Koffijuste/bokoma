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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

const sizes: Record<NonNullable<ModalProps['size']>, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  '2xl':'max-w-4xl',
  '3xl':'max-w-6xl',
  full: 'max-w-[95vw]',
};

export function Modal({ isOpen, onClose, title, description, children, actions, size = 'lg' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Fermeture par la touche Échap — convention modale standard.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
            <div className={`${sizes[size]} w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative`}>
              {/* Bouton fermer — TOUJOURS visible, même sans header (sinon la modale est piégée) */}
              <button
                onClick={onClose}
                aria-label="Fermer la modale"
                title="Fermer (Échap)"
                className="absolute top-3 right-3 z-10 p-2 bg-background/80 hover:bg-muted border border-border/60 rounded-lg transition-colors backdrop-blur-sm shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header (optionnel — affiché seulement si title ou description) */}
              {(title || description) && (
                <div className="flex items-start justify-between gap-10 px-6 py-4 border-b border-border pr-14">
                  <div>
                    {title && <h2 className="text-lg font-bold">{title}</h2>}
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                  </div>
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