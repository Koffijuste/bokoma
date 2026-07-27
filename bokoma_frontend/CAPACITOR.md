# Bokoma Store — Mobile App (Capacitor)

> **Cette doc explique comment builder, tester et publier l'app Android & iOS à partir du même code source que le site web.**

## 📋 Vue d'ensemble

L'app mobile est générée via **Capacitor 6** à partir du **même code source** Next.js. On n'a AUCUN code dupliqué :

- ✅ Toutes les pages (`app/`), composants (`components/`), hooks (`hooks/`), stores (`store/`)
- ✅ Tout le design Tailwind
- ✅ Toutes les routes
- ✅ Tout le système d'authentification (Zustand + JWT httpOnly)
- ✅ Tous les appels API (axios + cookies httpOnly)
- ✅ Les variables d'environnement

**Différences web ↔ mobile** :
- Le web reste un site normal (Next.js + Vercel/Railway)
- Le mobile est un **static export** (HTML/JS statique) bundlé dans une WebView native
- L'API backend est la même (Railway) — seules les URLs d'accès changent

## 🏗️ Architecture

```
bokoma_frontend/                # ← même code source
├── app/                        # Routes Next.js (réutilisées)
├── components/                 # Composants React (réutilisés)
├── hooks/, store/, services/   # Logique métier (réutilisée)
├── capacitor.config.ts         # ← Config native (noir)
├── next.config.js              # ← Branche `isCapacitor` activée par env
├── out/                        # ← Static export généré par `next build`
├── android/                    # ← Projet Android Studio (généré par `cap add`)
└── ios/                        # ← Projet Xcode (généré par `cap add`)
```

## 🚀 Commandes essentielles

### Premier setup (une seule fois)
```bash
npm install                    # Installe les deps Next.js
npm run mobile:android:add     # Crée le dossier android/
npm run mobile:ios:add         # Crée le dossier ios/ (macOS requis pour builder)
```

### Build & dev mobile
```bash
npm run build:mobile           # 1. Copie .env.mobile → .env.local
                               # 2. Lance `next build` avec CAPACITOR_BUILD=1
                               # 3. Génère le static export dans out/

npx cap sync                   # Copie out/ vers android/ et ios/
                               # Synchronise les plugins natifs

npx cap open android           # Ouvre Android Studio → Run ▶ sur un device/émulateur
npx cap open ios               # Ouvre Xcode (macOS uniquement) → Run ▶
```

### Build complet en une commande
```bash
npm run mobile:full            # = build:mobile + cap sync
```

## 📦 Build APK / AAB Android (production)

### Prérequis
- **Android Studio** installé (Hedgehog 2023.1.1+ recommandé)
- **JDK 17** configuré
- Un **keystore** de signature (à générer une seule fois) :
  ```bash
  cd android/app
  keytool -genkey -v -keystore bokoma-release.keystore \
          -alias bokoma -keyalg RSA -keysize 2048 -validity 10000
  ```
  → Note bien le mot de passe, l'alias et le chemin du fichier.

### Générer l'APK signé (distribution directe / tests)
1. **Android Studio** : `Build → Generate Signed Bundle / APK…`
2. Choisis **APK**, clique **Next**
3. Sélectionne ton keystore + entre le mot de passe
4. Choisis **release** comme build variant
5. Clique **Create** → l'APK sort dans `android/app/release/app-release.apk`

### En ligne de commande (plus rapide)
```bash
# 1. Place ta config de signature dans android/gradle.properties :
echo "
BOKOMA_UPLOAD_STORE_FILE=bokoma-release.keystore
BOKOMA_UPLOAD_KEY_ALIAS=bokoma
BOKOMA_UPLOAD_STORE_PASSWORD=xxx
BOKOMA_UPLOAD_KEY_PASSWORD=xxx
" >> android/gradle.properties

# 2. Édite android/app/build.gradle pour ajouter le signingConfig release
#    qui pointe sur ces variables (cf. doc Capacitor "Android deployment").

# 3. Build l'APK :
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk

# OU build l'AAB (pour Google Play) :
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

### Publication Google Play
1. Va sur [Google Play Console](https://play.google.com/console)
2. Crée une nouvelle app (ou sélectionne l'existante)
3. **Production → Créer une version** → Upload le `.aab`
4. Remplis les fiches (description, screenshots, politique de confidentialité…)
5. Soumets pour review (première review = ~7 jours, ensuite quelques heures)

## 🍎 Build iOS (production)

### Prérequis (macOS uniquement)
- **Xcode 15+** installé
- **CocoaPods** : `sudo gem install cocoapods` (ou `brew install cocoapods`)
- Un **Apple Developer Account** (99$/an) pour publier

### Setup initial (une seule fois)
```bash
cd ios
pod install
open App.xcworkspace          # Ouvre Xcode (⚠️ PAS App.xcodeproj)
```

Dans Xcode :
1. **Signing & Capabilities** → sélectionne ton **Team** Apple Developer
2. **Bundle Identifier** : `ci.bokoma.store` (déjà configuré dans capacitor.config.ts)
3. **Version** : 1.0.0 / **Build** : 1

### Build en ligne de commande
```bash
# Build pour un device physique ou simulateur :
xcodebuild -workspace ios/App/App.xcworkspace \
           -scheme App \
           -configuration Release \
           -destination 'generic/platform=iOS' \
           -archivePath ios/build/Bokoma.xcarchive \
           archive

# Export IPA (nécessite un provisioning profile) :
xcodebuild -exportArchive \
           -archivePath ios/build/Bokoma.xcarchive \
           -exportPath ios/build/Bokoma.ipa \
           -exportOptionsPlist ios/ExportOptions.plist
```

### Publication App Store
1. **Xcode → Product → Archive**
2. Une fois archivé, clique **Distribute App** → **App Store Connect**
3. Upload sur [App Store Connect](https://appstoreconnect.apple.com)
4. Remplis la fiche (screenshots 6.5" / 5.5" obligatoires)
5. Soumets pour review (première review = ~24-48h)

## 🔄 Mettre à jour l'app après une modif du site

Workflow de mise à jour (à chaque release) :

```bash
# 1. Sur le site web (déjà déployé normalement)
#    → pousse tes modifs sur Git
#    → Vercel redéploie automatiquement

# 2. Sur la branche mobile :
git checkout mobile              # (ou main, selon ton workflow)
npm run build:mobile             # Régénère out/
npx cap sync                     # Recopie dans android/ et ios/
npx cap open android             # Build l'APK/AAB dans Android Studio
npx cap open ios                 # Build l'IPA dans Xcode
```

> **Astuce** : si tu veux juste tester en dev sans rebuild natif,
> lance l'app native en mode debug et elle rechargera automatiquement
> le bundle JS depuis le serveur de dev (cf. doc Capacitor "Live Reload").

## 🔌 Plugins natifs installés

| Plugin | Usage | Status |
|--------|-------|--------|
| `@capacitor/status-bar` | Couleur + style de la barre de statut | ✅ Actif |
| `@capacitor/splash-screen` | Splash screen au lancement | ✅ Actif |
| `@capacitor/keyboard` | Resize auto quand le clavier s'ouvre | ✅ Actif |
| `@capacitor/network` | Détection online/offline | ✅ Actif |
| `@capacitor/app` | Back button Android + deep links | ✅ Actif |
| `@capacitor/device` | Info device (OS, version…) | ✅ Actif |
| `@capacitor/push-notifications` | Push (FCM Android / APNs iOS) | 🟡 Préparé |
| `@capacitor/camera` | Caméra (pour upload photo produit) | 🟡 Prêt |
| `@capacitor/geolocation` | Géoloc (si besoin futur) | 🟡 Prêt |
| `@capacitor/share` | Partage natif (sheet Android/iOS) | 🟡 Prêt |
| `@capacitor/browser` | Ouvrir un lien externe | 🟡 Prêt |
| `@capacitor/haptics` | Vibrations tactiles | ✅ Actif |
| `@capacitor/preferences` | KV storage natif | 🟡 Prêt |
| `@capacitor/screen-orientation` | Lock orientation | ✅ Actif |

Tous sont initialisés dans `components/providers/CapacitorProvider.tsx` au démarrage
de l'app. **Aucun impact sur le web** : les imports sont dynamiques
(la version web ne télécharge jamais les bundles natifs).

## ⚠️ Points d'attention

### Backend CORS
Le backend Railway (`bokoma-production.up.railway.app`) **doit** autoriser
les requêtes depuis l'origine Capacitor. Ajoute dans la config CORS :
```js
origin: [
  'https://bokoma.vercel.app',
  'capacitor://localhost',          // iOS
  'http://localhost',               // Android
  'https://localhost',              // Android (https)
]
```

### Cookies httpOnly en mobile
Les cookies JWT sont stockés par la WebView et transmis à chaque requête
axios (`withCredentials: true`). Vérifie que :
- Le backend accepte les cookies cross-origin
- SameSite=None; Secure (sur HTTPS)

### Push notifications
Pour activer les push :
1. **Android** : crée un projet Firebase, ajoute `google-services.json` dans `android/app/`
2. **iOS** : active APNs dans Capabilities, upload le certificat sur Firebase
3. Modifie `components/providers/CapacitorProvider.tsx` :
   - Décommente `PushNotifications.requestPermissions()` après onboarding
4. Backend : crée un endpoint `POST /api/v1/users/me/push-token` qui stocke le token

### Mises à jour OTA
Si tu veux éviter de republier l'app à chaque modif JS, regarde
[Capacitor Live Update](https://capacitorjs.com/docs/live-updates) (payant).

## 🆘 Debug

### Logs Android
```bash
# Logs en temps réel depuis le device/émulateur :
npx cap run android --livereload --external

# Ou via adb :
adb logcat | grep -i "chromium\|capacitor\|bokoma"
```

### Logs iOS
```bash
# Safari → Develop → [ton device] → localhost
# Ou via Xcode : Window → Devices and Simulators → ton device → Open Console
```

### Reset complet (si quelque chose casse)
```bash
npx cap sync --force
cd android && ./gradlew clean && cd ..
cd ios && rm -rf Pods Podfile.lock build && pod install && cd ..
```
