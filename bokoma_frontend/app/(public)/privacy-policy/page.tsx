// app/(public)/privacy-policy/page.tsx
// ============================================================================
// 🔒 POLITIQUE DE CONFIDENTIALITÉ — Conforme RGPD + CNIL + droit ivoirien
// ============================================================================
// Refonte : sommaire cliquable, sections enrichies, bandeaux d'engagement,
//          date de mise à jour, exemples concrets.
// ============================================================================

'use client';

import React from 'react';
import {
  Shield, Database, Share2, Cookie, UserCheck, Clock, Lock, Baby,
  Mail, Phone, FileText, ScrollText, Sparkles, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { CookiePreferencesButton } from '@/components/legal/CookiePreferencesButton';

// ───────────────────────────────────────────────────────────────────────────
// 🔹 SOMMAIRE
// ───────────────────────────────────────────────────────────────────────────

type Section = { id: string; title: string; icon: any };

const SECTIONS: Section[] = [
  { id: 'preambule',  title: '1. Préambule et engagement',         icon: Shield },
  { id: 'donnees',    title: '2. Données collectées',               icon: Database },
  { id: 'usage',      title: '3. Utilisation de vos données',       icon: FileText },
  { id: 'partage',    title: '4. Partage et sous-traitants',        icon: Share2 },
  { id: 'cookies',    title: '5. Cookies et traceurs',              icon: Cookie },
  { id: 'droits',     title: '6. Vos droits',                       icon: UserCheck },
  { id: 'conservation', title: '7. Durée de conservation',         icon: Clock },
  { id: 'securite',   title: '8. Sécurité',                         icon: Lock },
  { id: 'mineurs',    title: '9. Mineurs',                          icon: Baby },
];

const LAST_UPDATED = '7 juillet 2026';

// ───────────────────────────────────────────────────────────────────────────
// 🔹 COMPOSANT : Section
// ───────────────────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ id: string; title: string; Icon: any; children: React.ReactNode }> = ({ id, title, Icon, children }) => (
  <section id={id} className="scroll-mt-28 space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
    </div>
    <div className="text-muted-foreground leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-accent/5 via-background to-purple-500/5 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            <Shield className="w-3 h-3" />
            Protection des données
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Politique de <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">confidentialité</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg max-w-3xl">
            Chez Bokoma Store, nous respectons votre vie privée. Cette page décrit les données
            que nous collectons, comment nous les utilisons, et les droits dont vous disposez
            pour les contrôler.
          </p>
          <div className="flex flex-wrap gap-2 mt-5 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              Dernière mise à jour : <strong>{LAST_UPDATED}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              ✓ Conforme RGPD
            </span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              ✓ Conforme CNIL
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
            <SectionTitle id="preambule" title={SECTIONS[0].title} Icon={SECTIONS[0].icon}>
              <p>
                Bokoma Store, en sa qualité de responsable de traitement, s'engage à protéger
                la vie privée et les données personnelles de ses utilisateurs, conformément au
                Règlement Général sur la Protection des Données (RGPD), à la loi ivoirienne
                n°2013-450 relative à la protection des données à caractère personnel, et aux
                recommandations de la CNIL.
              </p>
              <p>
                Cette politique s'applique à tous les services proposés par Bokoma Store :
                navigation sur le site, création de compte, passation de commande, réception de
                newsletters et participation à des enquêtes ou jeux.
              </p>
              <p>
                <strong>Notre engagement en 3 principes :</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Transparence</strong> — vous savez toujours quelles données sont collectées et pourquoi.</li>
                <li><strong>Minimisation</strong> — nous collectons uniquement ce qui est nécessaire.</li>
                <li><strong>Contrôle</strong> — vous pouvez accéder, corriger ou supprimer vos données à tout moment.</li>
              </ul>
            </SectionTitle>

            <SectionTitle id="donnees" title={SECTIONS[1].title} Icon={SECTIONS[1].icon}>
              <p>Nous collectons uniquement les données nécessaires à la bonne exécution de nos services :</p>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-3 font-semibold">Catégorie</th>
                      <th className="text-left p-3 font-semibold">Exemples</th>
                      <th className="text-left p-3 font-semibold">Pourquoi</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Identité</td>
                      <td className="p-3">Prénom, nom</td>
                      <td className="p-3">Personnaliser votre compte et la livraison</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Contact</td>
                      <td className="p-3">Email, téléphone, adresse postale</td>
                      <td className="p-3">Vous joindre au sujet de vos commandes</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Paiement</td>
                      <td className="p-3">Moyen utilisé, transactions (pas le numéro de carte)</td>
                      <td className="p-3">Traiter et sécuriser vos paiements</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Commandes</td>
                      <td className="p-3">Historique, produits achetés, retours</td>
                      <td className="p-3">SAV, garantie, obligations comptables</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Navigation</td>
                      <td className="p-3">Pages visitées, durée, appareil, pays</td>
                      <td className="p-3">Améliorer le site (mesure d'audience)</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-3 font-medium text-foreground">Préférences</td>
                      <td className="p-3">Wishlist, centres d'intérêt, cookies</td>
                      <td className="p-3">Recommandations personnalisées</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Les données marquées par un astérisque dans nos formulaires sont obligatoires ;
                sans elles, le service demandé ne peut pas être fourni.
              </p>
            </SectionTitle>

            <SectionTitle id="usage" title={SECTIONS[2].title} Icon={SECTIONS[2].icon}>
              <p>Vos données sont utilisées uniquement pour :</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Traiter et livrer vos commandes, gérer les retours et remboursements.</li>
                <li>Vous envoyer les notifications importantes relatives à votre compte ou vos commandes.</li>
                <li>Personnaliser votre expérience (recommandations, wishlist) — <em>uniquement avec votre consentement</em>.</li>
                <li>Vous adresser notre newsletter et offres commerciales — <em>uniquement si vous y avez consenti</em>.</li>
                <li>Protéger le site et nos clients contre la fraude.</li>
                <li>Répondre à nos obligations légales et comptables.</li>
                <li>Améliorer en continu la qualité du site et de nos services (mesure d'audience agrégée).</li>
              </ul>
              <p>
                Aucune donnée n'est jamais utilisée à des fins incompatibles avec la finalité
                initiale de collecte.
              </p>
            </SectionTitle>

            <SectionTitle id="partage" title={SECTIONS[3].title} Icon={SECTIONS[3].icon}>
              <p>
                <strong>Nous ne vendons jamais vos données personnelles.</strong> Nous ne les
                partageons qu'avec les prestataires de confiance strictement nécessaires au
                fonctionnement du service :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Paiement</strong> — CinetPay (transactions chiffrées, certifié PCI-DSS).</li>
                <li><strong>Livraison</strong> — transporteurs et coursiers locaux partenaires.</li>
                <li><strong>Hébergement</strong> — Railway (serveur backend) et Vercel (frontend), conformes RGPD.</li>
                <li><strong>Images</strong> — Cloudinary (hébergement d'images produits).</li>
                <li><strong>Email transactionnel</strong> — service SMTP sécurisé.</li>
                <li><strong>Mesure d'audience</strong> — Vercel Analytics, agrégé et anonymisé.</li>
              </ul>
              <p>
                Tous nos sous-traitants sont liés par un accord de confidentialité et de
                conformité RGPD. Ils ne peuvent utiliser vos données que pour les missions
                qui leur sont confiées. En cas de transfert hors UE, nous veillons à ce que
                le pays d'accueil offre un niveau de protection adéquat.
              </p>
              <p>
                Nous pouvons également être amenés à communiquer vos données si la loi nous
                y oblige (réquisition judiciaire, contrôle fiscal) ou pour protéger nos
                droits en justice.
              </p>
            </SectionTitle>

            <SectionTitle id="cookies" title={SECTIONS[4].title} Icon={SECTIONS[4].icon}>
              <p>
                Lors de votre visite, des cookies ou technologies similaires peuvent être
                déposés sur votre appareil. Un cookie est un petit fichier texte qui ne permet
                pas de vous identifier directement, mais aide le site à fonctionner et à
                s'améliorer.
              </p>
              <p>Nous utilisons trois catégories de cookies, conformes aux recommandations de la CNIL :</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Cookies essentiels</strong> — strictement nécessaires au fonctionnement
                  du site (session, panier, authentification, sécurité). Ils ne tracent rien et
                  sont toujours actifs. <em>Base légale : exécution du contrat.</em>
                </li>
                <li>
                  <strong>Mesure d'audience</strong> — nous aide à comprendre l'usage du site
                  pour l'améliorer (pages vues, durée, provenance). Données agrégées et
                  anonymisées. <em>Base légale : consentement.</em>
                </li>
                <li>
                  <strong>Personnalisation &amp; marketing</strong> — affiche des produits adaptés
                  à vos centres d'intérêt et vous permet de partager sur les réseaux sociaux.
                  <em>Base légale : consentement.</em>
                </li>
              </ul>

              <div className="rounded-xl border border-border bg-muted/40 p-4 flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground flex-1">
                  Vous pouvez modifier vos choix à tout moment :
                </p>
                <CookiePreferencesButton />
              </div>

              <p>
                Vous pouvez également configurer votre navigateur pour refuser les cookies.
                Notez que cela peut dégrader votre expérience sur le site (par exemple,
                impossibilité de garder des articles dans votre panier).
              </p>
            </SectionTitle>

            <SectionTitle id="droits" title={SECTIONS[5].title} Icon={SECTIONS[5].icon}>
              <p>
                Conformément au RGPD et à la loi ivoirienne, vous disposez à tout moment des
                droits suivants sur vos données :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Droit d'accès</strong> — savoir quelles données nous détenons sur vous.</li>
                <li><strong>Droit de rectification</strong> — corriger des données inexactes ou incomplètes.</li>
                <li><strong>Droit d'effacement</strong> — demander la suppression de vos données (sauf obligations légales).</li>
                <li><strong>Droit à la portabilité</strong> — récupérer vos données dans un format ouvert (JSON, CSV).</li>
                <li><strong>Droit d'opposition</strong> — refuser le traitement de vos données à des fins de prospection.</li>
                <li><strong>Droit de retrait du consentement</strong> — à tout moment, pour les traitements basés sur le consentement.</li>
                <li><strong>Droit de réclamation</strong> — saisir la CNIL ou l'ARTCP (autorité ivoirienne) en cas de litige.</li>
              </ul>
              <p>
                Pour exercer ces droits, écrivez-nous à{' '}
                <a href="mailto:contact@bokoma.com" className="text-accent hover:underline">contact@bokoma.com</a>
                {' '}en joignant un justificatif d'identité. Nous répondons sous <strong>30 jours</strong>.
                Vous pouvez aussi gérer la plupart de ces droits directement depuis votre profil.
              </p>
            </SectionTitle>

            <SectionTitle id="conservation" title={SECTIONS[6].title} Icon={SECTIONS[6].icon}>
              <p>Nous conservons vos données uniquement le temps nécessaire :</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>Données de compte</strong> — tant que votre compte est actif + 3 ans après la dernière action.</li>
                <li><strong>Données de commande</strong> — 10 ans (obligation comptable).</li>
                <li><strong>Factures</strong> — 10 ans (obligation fiscale).</li>
                <li><strong>Cookies</strong> — 13 mois maximum (recommandation CNIL).</li>
                <li><strong>Prospection commerciale</strong> — 3 ans à compter du dernier contact.</li>
                <li><strong>Logs de connexion</strong> — 1 an (obligation légale).</li>
              </ul>
              <p>
                À l'issue de ces durées, les données sont supprimées ou anonymisées de manière
                irréversible.
              </p>
            </SectionTitle>

            <SectionTitle id="securite" title={SECTIONS[7].title} Icon={SECTIONS[7].icon}>
              <p>
                Nous mettons en œuvre toutes les mesures techniques et organisationnelles
                appropriées pour protéger vos données :
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Chiffrement HTTPS/TLS sur l'ensemble du site (navigation et API).</li>
                <li>Mots de passe hashés (bcrypt) — jamais stockés en clair.</li>
                <li>Cookies d'authentification httpOnly et signés (protection contre le XSS).</li>
                <li>Rate limiting sur les routes sensibles (anti brute-force).</li>
                <li>Sauvegardes régulières de la base de données.</li>
                <li>Accès aux données limité au personnel autorisé, avec traçabilité.</li>
                <li>Hébergeurs conformes RGPD avec datacenter en Europe.</li>
              </ul>
              <p>
                En cas de violation de données (piratage, fuite), nous vous notifierons dans
                les 72 h conformément au RGPD, ainsi que la CNIL.
              </p>
            </SectionTitle>

            <SectionTitle id="mineurs" title={SECTIONS[8].title} Icon={SECTIONS[8].icon}>
              <p>
                Le site est destiné aux personnes âgées d'au moins <strong>16 ans</strong>.
                Nous ne collectons pas sciemment de données auprès de mineurs de moins de 16 ans
                sans le consentement de leurs parents.
              </p>
              <p>
                Si vous pensez qu'un mineur a créé un compte sur notre site, contactez-nous à{' '}
                <a href="mailto:contact@bokoma.com" className="text-accent hover:underline">contact@bokoma.com</a>
                {' '}pour que nous procédions à la suppression immédiate.
              </p>
            </SectionTitle>

            {/* ── Bandeau contact ── */}
            <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-purple-500/5 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold mb-1">Exercez vos droits</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Notre Délégué à la Protection des Données (DPO) est à votre écoute pour
                    toute question ou demande relative à vos données personnelles.
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
                    <Link
                      href="/feedback"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-accent/40 text-sm font-medium transition-colors"
                    >
                      Formulaire de contact
                      <ArrowRight className="w-4 h-4 text-accent" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-4">
              <Link href="/terms" className="hover:text-accent">Conditions d'utilisation</Link>
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
