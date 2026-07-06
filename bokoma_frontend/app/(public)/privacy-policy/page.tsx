"use client";

import { CookiePreferencesButton } from '@/components/legal/CookiePreferencesButton';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-sm">
          <h1 className="text-4xl font-bold mb-6">Politique de confidentialité</h1>
          <p className="text-muted-foreground mb-6">
            Chez Bokoma Store, nous respectons votre vie privée et nous nous engageons à protéger vos informations personnelles,
            conformément au Règlement Général sur la Protection des Données (RGPD) et aux recommandations de la CNIL.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Données collectées</h2>
            <p className="text-muted-foreground">
              Nous collectons les informations nécessaires pour traiter vos commandes, gérer votre compte et améliorer votre expérience.
              Cela inclut votre nom, email, adresse, moyen de paiement, et les informations de connexion.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Utilisation des données</h2>
            <p className="text-muted-foreground">Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>traiter et livrer vos commandes,</li>
              <li>vous envoyer des notifications importantes,</li>
              <li>personnaliser vos recommandations (uniquement avec votre consentement),</li>
              <li>protéger le site contre la fraude.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons pas vos données personnelles. Nous pouvons partager des informations avec des prestataires de services
              fiables pour l'expédition, le paiement et la gestion de la plateforme. Tous nos partenaires sont conformes au RGPD.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Cookies et technologies similaires</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies répartis en trois catégories, conformément aux recommandations de la CNIL :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Cookies essentiels</strong> — strictement nécessaires au fonctionnement du site (session, panier, sécurité).
                Ils ne tracent rien et sont toujours actifs.
              </li>
              <li>
                <strong>Mesure d'audience</strong> — nous aide à comprendre l'usage du site pour l'améliorer.
                Activé uniquement avec votre consentement.
              </li>
              <li>
                <strong>Personnalisation &amp; marketing</strong> — permet d'afficher des produits adaptés à vos centres d'intérêt.
                Activé uniquement avec votre consentement.
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground flex-1">
                Vous pouvez modifier vos choix à tout moment :
              </p>
              <CookiePreferencesButton />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Vos droits</h2>
            <p className="text-muted-foreground">
              Vous pouvez demander l'accès, la correction ou la suppression de vos données. Contactez-nous à{' '}
              <a href="mailto:contact@bokoma.com" className="text-accent hover:underline">contact@bokoma.com</a>{' '}
              pour exercer vos droits. Vous disposez également d'un droit de recours auprès de la CNIL.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Durée de conservation</h2>
            <p className="text-muted-foreground">
              Vos données de commande sont conservées 10 ans (obligation comptable). Vos préférences cookies sont conservées
              13 mois maximum, conformément aux recommandations de la CNIL.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}