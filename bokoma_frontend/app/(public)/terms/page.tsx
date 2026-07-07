// app/(public)/terms/page.tsx
// ============================================================================
// 📜 CGU — Conditions Générales d'Utilisation
// ============================================================================
// Refonte : sommaire cliquable, 12 sections, date de mise à jour, alertes.
// ============================================================================

'use client';

import React from 'react';
import {
  FileText, ScrollText, User, ShoppingBag, CreditCard, Truck,
  RotateCcw, Ban, Brain, AlertTriangle, Scale, Phone,
  CheckCircle2, Sparkles, Mail,
} from 'lucide-react';
import Link from 'next/link';

// ───────────────────────────────────────────────────────────────────────────
// 🔹 SOMMAIRE
// ───────────────────────────────────────────────────────────────────────────

type Section = { id: string; title: string; icon: any };

const SECTIONS: Section[] = [
  { id: 'acceptation', title: '1. Acceptation des conditions', icon: CheckCircle2 },
  { id: 'definitions',  title: '2. Définitions',                 icon: ScrollText },
  { id: 'compte',       title: '3. Compte utilisateur',           icon: User },
  { id: 'commandes',    title: '4. Commandes',                    icon: ShoppingBag },
  { id: 'prix',         title: '5. Prix et paiement',             icon: CreditCard },
  { id: 'livraison',    title: '6. Livraison',                    icon: Truck },
  { id: 'retours',      title: '7. Rétractation, retours et remboursements', icon: RotateCcw },
  { id: 'utilisation',  title: '8. Utilisation du site',          icon: Brain },
  { id: 'proprio',      title: '9. Propriété intellectuelle',     icon: FileText },
  { id: 'responsabilite', title: '10. Responsabilité',            icon: AlertTriangle },
  { id: 'suspension',   title: '11. Suspension et résiliation',   icon: Ban },
  { id: 'droit',        title: '12. Droit applicable et litiges', icon: Scale },
];

// ───────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : Titre de section
// ───────────────────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ id: string; title: string; Icon: any; children: React.ReactNode }> = ({ id, title, Icon, children }) => (
  <section id={id} className="scroll-mt-28 space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
    </div>
    <div className="text-muted-foreground leading-relaxed space-y-3 pl-0 sm:pl-13">
      {children}
    </div>
  </section>
);

const LAST_UPDATED = '7 juillet 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-accent/5 via-background to-purple-500/5 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <ScrollText className="w-3 h-3" />
            Document légal
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Conditions Générales d'<span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">Utilisation</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg max-w-3xl">
            Les règles qui encadrent l'utilisation de Bokoma Store. En utilisant notre site,
            vous acceptez les conditions ci-dessous. Prenez le temps de les lire.
          </p>
          <div className="flex flex-wrap gap-2 mt-5 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              Dernière mise à jour : <strong>{LAST_UPDATED}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              Version 1.0
            </span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              Applicable en Côte d'Ivoire 🇇�🇮
            </span>
          </div>
        </div>
      </section>

      {/* ── Corps : TOC + contenu ───────────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sommaire (sticky desktop) */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Sommaire
                </p>
                <nav className="space-y-1">
                  {SECTIONS.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-sm text-muted-foreground hover:text-accent hover:translate-x-0.5 transition-all py-1"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Contenu */}
          <article className="lg:col-span-9 space-y-10">
            {/* Préambule */}
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6">
              <p className="text-sm leading-relaxed">
                <strong>Bokoma Store</strong> est une plateforme de commerce en ligne éditée par
                Bokoma, opérant depuis Abidjan, Côte d'Ivoire. Les présentes Conditions Générales
                d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation du site
                <strong> bokoma.vercel.app</strong> ainsi que de tous les services associés.
                Elles constituent un accord contractuel entre vous (l'utilisateur) et Bokoma.
              </p>
            </div>

            <SectionTitle id="acceptation" title={SECTIONS[0].title} Icon={SECTIONS[0].icon}>
              <p>
                En accédant à Bokoma Store, en créant un compte, en passant commande ou en utilisant
                tout service associé, vous reconnaissez avoir lu, compris et accepté sans réserve
                les présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser
                le site.
              </p>
              <p>
                Nous nous réservons le droit de modifier les CGU à tout moment. Les modifications
                entrent en vigueur dès leur publication. Les CGU applicables sont celles en vigueur
                à la date de votre commande.
              </p>
            </SectionTitle>

            <SectionTitle id="definitions" title={SECTIONS[1].title} Icon={SECTIONS[1].icon}>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>« Site »</strong> : le site web Bokoma Store accessible à l'adresse bokoma.vercel.app.</li>
                <li><strong>« Utilisateur »</strong> : toute personne naviguant sur le site, avec ou sans compte.</li>
                <li><strong>« Client »</strong> : utilisateur disposant d'un compte client validé.</li>
                <li><strong>« Commande »</strong> : tout achat de produit effectué via le site.</li>
                <li><strong>« Produit »</strong> : bien proposé à la vente sur le site.</li>
                <li><strong>« Contenu »</strong> : tout texte, image, vidéo, avis ou donnée publié(e) par un utilisateur.</li>
              </ul>
            </SectionTitle>

            <SectionTitle id="compte" title={SECTIONS[2].title} Icon={SECTIONS[2].icon}>
              <p>
                Pour passer commande, vous devez créer un compte en fournissant des informations
                exactes, complètes et à jour. Vous êtes responsable de la confidentialité de vos
                identifiants (email + mot de passe) et de toutes les actions effectuées depuis
                votre compte.
              </p>
              <p>
                En cas de perte, vol ou utilisation non autorisée de vos identifiants, informez-nous
                immédiatement à <a href="mailto:contact@bokoma.com" className="text-accent hover:underline">contact@bokoma.com</a>.
                Bokoma ne saurait être tenu responsable des dommages résultant d'une utilisation
                non autorisée de votre compte due à un défaut de vigilance de votre part.
              </p>
              <p>
                Vous pouvez demander la suppression de votre compte à tout moment depuis votre profil
                ou en contactant le support. La suppression est définitive après 30 jours.
              </p>
            </SectionTitle>

            <SectionTitle id="commandes" title={SECTIONS[3].title} Icon={SECTIONS[3].icon}>
              <p>
                Les commandes sont passées exclusivement via le site. Toute commande suppose :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>L'acceptation des présentes CGU et de notre <Link href="/privacy-policy" className="text-accent hover:underline">politique de confidentialité</Link>.</li>
                <li>La fourniture d'informations exactes (identité, adresse de livraison, contact).</li>
                <li>La validation du paiement (ou du choix de paiement à la livraison).</li>
              </ul>
              <p>
                Bokoma se réserve le droit de refuser ou d'annuler toute commande en cas de :
                stock insuffisant, problème de paiement, informations de livraison inexactes ou
                incomplètes, suspicion de fraude, ou violation des présentes CGU.
              </p>
              <p>
                Une commande est ferme et définitive dès la réception de l'email de confirmation.
                Vous pouvez demander son annulation tant qu'elle n'a pas été expédiée.
              </p>
            </SectionTitle>

            <SectionTitle id="prix" title={SECTIONS[4].title} Icon={SECTIONS[4].icon}>
              <p>
                Tous les prix sont affichés en <strong>Francs CFA (XOF)</strong>, toutes taxes comprises (TTC).
                Les frais de livraison sont indiqués séparément avant la validation du paiement.
              </p>
              <p>
                Bokoma se réserve le droit de modifier ses prix à tout moment, les produits étant
                toutefois facturés sur la base du tarif en vigueur au moment de la validation de
                la commande.
              </p>
              <p><strong>Modes de paiement acceptés :</strong></p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Mobile Money (Orange Money, MTN Money, Wave, Moov Money)</li>
                <li>Carte bancaire (Visa, Mastercard) via CinetPay</li>
                <li>Paiement à la livraison (Cash, selon zones desservies)</li>
              </ul>
              <p>
                Les transactions sont sécurisées par notre passerelle de paiement CinetPay,
                certifiée PCI-DSS. Aucune donnée bancaire n'est stockée sur nos serveurs.
              </p>
            </SectionTitle>

            <SectionTitle id="livraison" title={SECTIONS[5].title} Icon={SECTIONS[5].icon}>
              <p>
                Bokoma livre en Côte d'Ivoire et dans plusieurs pays d'Afrique de l'Ouest.
                Les délais et frais varient selon la destination et sont affichés au checkout.
              </p>
              <p>
                Les délais indiqués sont communiqués à titre indicatif. Un retard éventuel
                (intempéries, force majeure, douanes) ne peut donner lieu à des dommages-intérêts.
                La livraison s'effectue à l'adresse que vous avez indiquée ; vous êtes responsable
                de l'exactitude de cette adresse.
              </p>
              <p>
                Le transfert des risques a lieu au moment de la remise effective du colis au
                client ou à un tiers désigné. Il vous appartient de vérifier l'état du colis à
                la réception et d'émettre des réserves précises auprès du livreur en cas de
                dommage.
              </p>
            </SectionTitle>

            <SectionTitle id="retours" title={SECTIONS[6].title} Icon={SECTIONS[6].icon}>
              <p>
                Conformément au code ivoirien de la consommation, vous disposez d'un délai de
                <strong> 7 jours</strong> à compter de la réception pour exercer votre droit de
                rétractation, sans pénalité et sans justification.
              </p>
              <p>
                Le produit doit être retourné dans son état d'origine (non porté, non lavé,
                étiquettes intactes, emballage d'origine). Les frais de retour sont à la
                charge du client sauf en cas de produit défectueux ou d'erreur de notre part.
              </p>
              <p>
                Le remboursement est effectué sous 3 à 5 jours ouvrés après vérification du
                produit retourné, sur le même moyen de paiement que celui utilisé lors de la
                commande. Les frais de livraison initiaux ne sont pas remboursés, sauf en cas
                de produit défectueux ou d'erreur de Bokoma.
              </p>
              <p>
                Pour initier un retour, rendez-vous dans <Link href="/profile?tab=orders" className="text-accent hover:underline">Mes Commandes</Link> ou
                contactez le support.
              </p>
            </SectionTitle>

            <SectionTitle id="utilisation" title={SECTIONS[7].title} Icon={SECTIONS[7].icon}>
              <p>Vous vous engagez à utiliser le site de manière loyale et conforme à sa destination. Il est strictement interdit de :</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Usurper l'identité d'un tiers ou fournir de fausses informations.</li>
                <li>Publier des contenus illicites, injurieux, diffamatoires, discriminatoires ou portant atteinte aux droits de tiers.</li>
                <li>Tenter de porter atteinte au fonctionnement du site (piratage, injection, robots malveillants, surcharge volontaire).</li>
                <li>Extraire ou réutiliser massivement les contenus du site à des fins commerciales sans autorisation.</li>
                <li>Contourner les mesures de sécurité ou d'authentification.</li>
              </ul>
            </SectionTitle>

            <SectionTitle id="proprio" title={SECTIONS[8].title} Icon={SECTIONS[8].icon}>
              <p>
                L'ensemble des éléments du site (textes, images, logos, vidéos, codes, design,
                structure) est protégé par le droit d'auteur et le droit des marques, et demeure
                la propriété exclusive de Bokoma ou de ses partenaires.
              </p>
              <p>
                Toute reproduction, représentation, modification ou exploitation, totale ou
                partielle, sans autorisation écrite préalable, est interdite et constitue un
                acte de contrefaçon sanctionné par la loi.
              </p>
              <p>
                Les avis et contenus publiés par les utilisateurs restent la propriété de leurs
                auteurs, mais leur publication sur le site nous confère une licence non exclusive
                de reproduction et d'affichage.
              </p>
            </SectionTitle>

            <SectionTitle id="responsabilite" title={SECTIONS[9].title} Icon={SECTIONS[9].icon}>
              <p>
                Bokoma met tout en œuvre pour assurer l'exactitude des informations publiées
                (descriptions produits, prix, stocks) et la disponibilité du site 24/7. Toutefois,
                nous ne saurions garantir une exactitude absolue ou une disponibilité continue.
              </p>
              <p>
                Bokoma ne pourra être tenu responsable des dommages indirects (perte de chiffre
                d'affaires, perte de données, préjudice commercial) résultant de l'utilisation
                ou de l'impossibilité d'utiliser le site. Notre responsabilité est limitée au
                montant de la commande concernée.
              </p>
              <p>
                Les photos des produits sont non contractuelles. De légères différences peuvent
                apparaître du fait de la lumière, de l'écran ou des réglages.
              </p>
            </SectionTitle>

            <SectionTitle id="suspension" title={SECTIONS[10].title} Icon={SECTIONS[10].icon}>
              <p>
                En cas de manquement à vos obligations, de fraude avérée ou de comportement
                portant atteinte au site ou à d'autres utilisateurs, Bokoma se réserve le droit de :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Suspendre ou résilier votre compte, sans préavis.</li>
                <li>Annuler les commandes en cours.</li>
                <li>Engager toute procédure judiciaire utile.</li>
              </ul>
              <p>
                Vous pouvez résilier votre compte à tout moment depuis votre profil ou en
                contactant le support. La résiliation n'affecte pas les commandes en cours.
              </p>
            </SectionTitle>

            <SectionTitle id="droit" title={SECTIONS[11].title} Icon={SECTIONS[11].icon}>
              <p>
                Les présentes CGU sont régies par le droit ivoirien. Tout litige relatif à leur
                interprétation ou à leur exécution relèvera de la compétence des tribunaux
                d'Abidjan, sauf règle de procédure impérative contraire.
              </p>
              <p>
                En cas de réclamation non résolue par notre service client, vous pouvez recourir
                gratuitement au médiateur de la consommation ou saisir la <strong>Commission
                de la concurrence et de la consommation</strong> compétente.
              </p>
              <p>
                Pour toute question relative à ces CGU :{' '}
                <a href="mailto:contact@bokoma.com" className="text-accent hover:underline">contact@bokoma.com</a>.
              </p>
            </SectionTitle>

            {/* ── Bandeau de contact ── */}
            <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-purple-500/5 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold mb-1">Une question sur ces conditions ?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Notre équipe est disponible pour vous éclairer sur n'importe quel point
                    des CGU.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="mailto:contact@bokoma.com"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-accent/40 text-sm font-medium transition-colors"
                    >
                      <Mail className="w-4 h-4 text-accent" />
                      contact@bokoma.com
                    </a>
                    <a
                      href="tel:+2250798300782"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-accent/40 text-sm font-medium transition-colors"
                    >
                      <Phone className="w-4 h-4 text-accent" />
                      +225 07 98 30 07 82
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-4">
              <Link href="/privacy-policy" className="hover:text-accent">Politique de confidentialité</Link>
              {' · '}
              <Link href="/faq" className="hover:text-accent">FAQ</Link>
              {' · '}
              <Link href="/guide" className="hover:text-accent">Guide d'achat</Link>
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
