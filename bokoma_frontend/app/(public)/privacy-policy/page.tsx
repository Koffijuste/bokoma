"use client";

import { PublicPageHeader } from "@/components/ui/public-page-header";
import { Shield } from "lucide-react";

<PublicPageHeader
  title="Politique de Confidentialité"
  description="Protection de vos données personnelles"
  icon={<Shield className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />}
  breadcrumbs={[{ label: 'Confidentialité' }]}
/>
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-sm"
        >
          <h1 className="text-4xl font-bold mb-6">Politique de confidentialité</h1>
          <p className="text-muted-foreground mb-6">
            Chez Bokoma Store, nous respectons votre vie privée et nous nous engageons à protéger vos informations personnelles.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Données collectées</h2>
            <p className="text-muted-foreground">
              Nous collectons les informations nécessaires pour traiter vos commandes, gérer votre compte et améliorer votre expérience. Cela inclut votre nom, email, adresse, moyen de paiement, et les informations de connexion.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Utilisation des données</h2>
            <p className="text-muted-foreground">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>traiter et livrer vos commandes,</li>
              <li>vous envoyer des notifications importantes,</li>
              <li>personnaliser vos recommandations,</li>
              <li>protéger le site contre la fraude.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons pas vos données personnelles. Nous pouvons partager des informations avec des prestataires de services fiables pour l’expédition, le paiement et la gestion de la plateforme.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Cookies et technologies similaires</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies pour améliorer votre navigation, mémoriser vos préférences et analyser l’usage du site.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Vos droits</h2>
            <p className="text-muted-foreground">
              Vous pouvez demander l’accès, la correction ou la suppression de vos données. Contactez-nous à contact@bokoma.com pour exercer vos droits.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
