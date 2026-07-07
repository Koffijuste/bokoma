import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Guide d'achat",
  description: "Découvrez comment acheter sur Bokoma Store : créer un compte, parcourir les produits, passer commande, payer et suivre sa livraison.",
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
