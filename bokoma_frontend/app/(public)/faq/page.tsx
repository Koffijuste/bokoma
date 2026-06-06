"use client";

export default function FaqPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-sm"
        >
          <h1 className="text-4xl font-bold mb-6">FAQ</h1>
          <p className="text-muted-foreground mb-6">
            Retrouvez ici les réponses aux questions les plus fréquentes sur votre expérience Bokoma Store.
          </p>

          <section className="space-y-6">
            <article className="space-y-3">
              <h2 className="text-2xl font-semibold">Comment passer une commande ?</h2>
              <p className="text-muted-foreground">
                Ajoutez les articles à votre panier, puis rendez-vous sur la page de paiement pour finaliser votre commande.
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-2xl font-semibold">Quels moyens de paiement sont acceptés ?</h2>
              <p className="text-muted-foreground">
                Nous acceptons les paiements par carte bancaire et d'autres moyens disponibles selon la configuration du site.
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-2xl font-semibold">Comment suivre ma commande ?</h2>
              <p className="text-muted-foreground">
                Vous pouvez suivre l’état de vos commandes depuis votre espace personnel dans la section « Mes Commandes ».
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-2xl font-semibold">Puis-je retourner un produit ?</h2>
              <p className="text-muted-foreground">
                Les retours sont possibles selon les conditions indiquées sur le site. Contactez le service client pour en savoir plus.
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-2xl font-semibold">Comment contacter le support ?</h2>
              <p className="text-muted-foreground">
                Envoyez-nous un email à contact@bokoma.com ou utilisez le formulaire de contact si disponible sur le site.
              </p>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
