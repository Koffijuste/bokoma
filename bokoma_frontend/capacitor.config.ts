// capacitor.config.ts
// ============================================================================
// ⚡ CAPACITOR — Configuration Bokoma Store
// ============================================================================
// Le but : transformer le build Next.js en bundle Android/iOS sans réécrire
// la moindre ligne de l'app web. On pointe Capacitor vers le dossier
// généré par `next build` en mode `output: 'export'` (`out/`).
//
// Quand tu modifies le site web :
//   1. `npm run build:mobile`  → regénère le dossier out/ (static export)
//   2. `npx cap sync`          → recopie out/ dans android/ et ios/
//   3. `npx cap open android`  → rebuild APK/AAB dans Android Studio
//      ou  `npx cap open ios`  → rebuild IPA dans Xcode
// ============================================================================

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Identifiant unique de l'app (reverse-DNS, ne JAMAIS changer après
  // publication Play Store / App Store sinon c'est considéré comme une
  // nouvelle app).
  appId: 'ci.bokoma.store',

  // Nom affiché sous l'icône sur l'écran d'accueil.
  appName: 'Bokoma Store',

  // Dossier contenant le bundle web produit par `next build`.
  // (next.config.js bascule sur `output: 'export'` quand on lance
  //  `npm run build:mobile` → génère un dossier `out/` qu'on pointe ici)
  webDir: 'out',

  // Répertoire de travail (parent des plateformes android/ios).
  // Par défaut c'est la racine du projet Next.js — c'est exactement ce qu'on
  // veut : `android/` et `ios/` seront créés ici, à côté de `app/`,
  // `components/`, etc.
  // (androidStudioPath / iosProjectPath : NE PAS surcharger — Capacitor
  //  utilise les défauts qui correspondent aux standards de chaque IDE.)

  // Empaquetage web à utiliser dans la WebView. Sur Android moderne, le
  // Chrome System WebView est toujours à jour. On garde le défaut
  // ("hybrid" : bundle local + API Capacitor natives) — c'est le seul mode
  // qui permet d'appeler les plugins natifs (Caméra, Géoloc, etc.).
  bundledWebRuntime: false,

  // Couleurs de la splash screen et de la status bar (cf. plugins
  // SplashScreen + StatusBar). On reprend la palette de l'app web.
  backgroundColor: '#0a0a0a',

  // ─── Android ────────────────────────────────────────────────────────────
  android: {
    // Empêche Android Studio de build en mode release par défaut. On build
    // toujours en debug pendant le dev, et en release via `assembleRelease`
    // pour les APK/AAB.
    allowMixedContent: false,
    // Capture les erreurs JS → affichées dans Logcat (utile en debug).
    webContentsDebuggingEnabled: true,
    // On garde la cible SDK par défaut (Capacitor 6 → SDK 34).
    // Si tu veux overrider : `minSdkVersion: 23`, `targetSdkVersion: 34`.
  },

  // ─── iOS ────────────────────────────────────────────────────────────────
  ios: {
    contentInset: 'automatic', // respecte la safe-area (encoche, Dynamic Island)
    // Capture les erreurs JS → affichées dans Safari Web Inspector.
    webContentsDebuggingEnabled: true,
    // Les options iOS "contentInsetAdjustmentBehavior" et "scrollEdgeAppearance"
    // ne sont pas dans le type Capacitor 6 → on les gère via le CSS
    // (html.is-capacitor { -webkit-overflow-scrolling: touch } et
    //  .pt-safe { padding-top: env(safe-area-inset-top) } dans globals.css).
  },

  // ─── Plugins natifs (config partagée) ──────────────────────────────────
  plugins: {
    // StatusBar : thème sombre pour matcher le branding Bokoma
    StatusBar: {
      style: 'DARK',         // texte clair (car fond sombre)
      backgroundColor: '#0a0a0a',
      overlaysWebView: false, // ne passe PAS par-dessus la WebView
    },
    // SplashScreen : plein écran, on laisse l'utilisateur la cacher via
    // `SplashScreen.hide()` dans le provider après le 1er render.
    SplashScreen: {
      launchShowDuration: 1500,        // 1.5s par défaut, on peut appeler
                                       // `SplashScreen.hide()` plus tôt
      launchAutoHide: true,            // auto-hide après launchShowDuration
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      spinnerColor: '#a855f7',         // primary Bokoma
      iosSpinnerStyle: 'small',
    },
    // Keyboard : ajuste la WebView quand le clavier s'ouvre (évite de
    // cacher le champ de saisie)
    Keyboard: {
      // On laisse les valeurs par défaut (resize="native" + style adaptatif
      // selon l'apparence système). Pour overrider, utilise l'enum TypeScript
      // importé depuis @capacitor/keyboard.
      // resize: KeyboardResize.Native,
      // style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
