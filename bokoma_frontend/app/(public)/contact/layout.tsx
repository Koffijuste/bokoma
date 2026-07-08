// app/(public)/contact/layout.tsx
// ============================================================================
// 🏷️ METADATA — Page Contact (audit sécurité 08/07/2026)
// ============================================================================
// Pas d'email ni de téléphone en clair dans les meta (évite l'indexation
// par les scrapers de PII dans OpenGraph/Twitter Card).
// ============================================================================

import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Contactez Bokoma Store — Service client Abidjan',
  description:
    "Posez-nous vos questions sur vos commandes, livraisons ou produits. " +
    "Notre équipe basée à Abidjan vous répond sous 24 à 48 heures ouvrées.",
  alternates: {
    canonical: '/contact',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Contactez Bokoma Store',
    description: 'Notre équipe service client vous répond rapidement.',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
