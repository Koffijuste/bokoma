// app/terms/page.tsx
"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl font-bold mb-6">Conditions d'utilisation</h1>
          <p className="text-muted-foreground mb-6">
            Ces conditions décrivent les règles et principes qui régissent l'utilisation de Bokoma Store.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptation</h2>
            <p className="text-muted-foreground">
              En utilisant notre site, vous acceptez ces conditions d'utilisation et vous vous engagez à les respecter.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Compte utilisateur</h2>
            <p className="text-muted-foreground">
              Vous êtes responsable de la confidentialité de votre compte et de vos identifiants. Toute activité sous votre compte est de votre responsabilité.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Commandes et paiements</h2>
            <p className="text-muted-foreground">
              Les commandes sont soumises à disponibilité. Nous nous réservons le droit de refuser ou d'annuler toute commande en cas de problème de stock ou de paiement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Livraison et retours</h2>
            <p className="text-muted-foreground">
              Les modalités de livraison, retour et remboursement sont précisées sur le site. Les délais indiqués sont donnés à titre indicatif.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Responsabilité</h2>
            <p className="text-muted-foreground">
              Nous ne pouvons être tenus responsables des dommages indirects ou de l'utilisation incorrecte des produits achetés sur notre site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}