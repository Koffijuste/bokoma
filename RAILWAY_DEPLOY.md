# 🚂 Déploiement Bokoma-Store sur Railway

> Test à 15 personnes — backend + frontend en cloud, MongoDB Atlas déjà en place.

## 🎯 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                         Railway Project                    │
│                                                             │
│   ┌──────────────────────┐   ┌──────────────────────────┐  │
│   │  Service : backend   │   │  Service : frontend       │  │
│   │  bokoma-backend      │   │  bokoma-frontend          │  │
│   │  Express.js :5000    │   │  Next.js    :3000        │  │
│   │                      │   │                            │  │
│   │  Dockerfile ✓        │   │  Dockerfile ✓             │  │
│   │  railway.toml  ✓     │   │  railway.toml ✓           │  │
│   └──────────┬───────────┘   └────────────┬───────────────┘  │
│              │                            │                   │
└──────────────┼────────────────────────────┼───────────────────┘
               │                            │
               ▼                            ▼
   ┌────────────────────┐         ┌────────────────────────┐
   │  MongoDB Atlas     │         │  Cloudinary (images)   │
   │  (déjà configuré)  │         │  (déjà configuré)      │
   └────────────────────┘         └────────────────────────┘
```

## 💰 Coûts estimés (test ~15 personnes, 1 mois)

| Service | Coût estimé |
|---|---|
| Backend Railway (24/7) | ~$5/mois |
| Frontend Railway (24/7) | ~$5/mois |
| **Total** | **~$10/mois** |

Railway offre **$5 de crédit gratuit** pour les nouveaux comptes → il reste ~$5 à payer pour 1 mois de test à 15 personnes.

> 💡 **Astuce :** Si tu veux 100% gratuit, remplace le frontend par **Vercel** (gratuit illimité pour Next.js) et garde uniquement le backend sur Railway.

---

## 🚀 Étape 1 — Préparer le repo

```bash
# Vérifier que tout est committé (les Dockerfiles & railway.toml ont été ajoutés)
git add Bokoma_Backend/Dockerfile Bokoma_Backend/.dockerignore Bokoma_Backend/railway.toml
git add bokoma_frontend/Dockerfile bokoma_frontend/.dockerignore bokoma_frontend/railway.toml
git add bokoma_frontend/next.config.js        # modifié (output: standalone)
git add Bokoma_Backend/src/server.js          # modifié (CORS)
git add Bokoma_Backend/src/controllers/auth.controller.js
git add Bokoma_Backend/src/services/email.service.js
git add Bokoma_Backend/src/routes/auth.routes.js
git add Bokoma_Backend/src/models/User.js
git add bokoma_frontend/app/\(public\)/checkout/page.tsx
git add bokoma_frontend/app/\(public\)/auth/forgot-password/page.tsx
git add bokoma_frontend/services/api.ts
git add bokoma_frontend/services/index.ts

git commit -m "feat: otp reset password + checkout popup + railway deploy"
git push
```

---

## 🚂 Étape 2 — Créer le projet Railway

1. Va sur [railway.app](https://railway.app) et connecte-toi avec GitHub.
2. **New Project** → **Deploy from GitHub repo** → sélectionne `Bokoma-Store`.
3. Le projet est créé, mais Railway n'a détecté que le repo racine — il faut maintenant ajouter **2 services**.

---

## 🛠 Étape 3 — Service Backend

### 3a. Ajouter le service

1. Dans le projet Railway, **+ New** → **GitHub Repo** → re-sélectionne `Bokoma-Store`.
2. Clique sur le service créé → **Settings** :
   - **Root Directory** : `Bokoma_Backend`
   - **Watch Paths** : `Bokoma_Backend/**`
   - **Build Command** : (laisser vide, Docker s'en charge)
   - **Start Command** : `node ./src/server.js`
3. Railway build l'image avec le `Dockerfile` automatiquement.

### 3b. Variables d'environnement

Va dans l'onglet **Variables** et colle :

```env
# ─── Serveur ──────────────────────────────────────────────
NODE_ENV=production
PORT=5000
ORIGIN=*

# ─── MongoDB Atlas (copie la valeur depuis ton .env local) ─
MONGO_URI=mongodb+srv://primeHunter:...@app-js-fullstack.digqdpt.mongodb.net/bokoma?retryWrites=true&w=majority&serverSelectionTimeoutMS=10000&socketTimeoutMS=45000&family=4

# ─── JWT (VALEURS DIFFÉRENTES du .env local — régénère ! ) ──
JWT_ACCESS_SECRET=Genere_une_nouvelle_cle_32_chars_minimum_ici_2024
JWT_REFRESH_SECRET=Genere_une_autre_cle_32_chars_minimum_ici_2024
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=bokoma-api
JWT_AUDIENCE=bokoma-users

# ─── CinetPay (sandbox) ───────────────────────────────────
CINETPAY_API_KEY=<TA_CLE_CINETPAY_SANDBOX_ICI>
CINETPAY_API_PASSWORD_CI=<TON_MOT_DE_PASSE_CINETPAY_ICI>
CINETPAY_API_URL=https://api.cinetpay.net
CINETPAY_MODE=sandbox

# ─── Cloudinary ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=dfinmurky
CLOUDINARY_API_KEY=899394629886434
CLOUDINARY_API_SECRET=xz7XZYt5knd30r7GWzEMY6DbSPI
CLOUDINARY_URL=cloudinary://899394629886434:xz7XZYt5knd30r7GWzEMY6DbSPI@dfinmurky

# ─── Email (pour les OTP) ─────────────────────────────────
# ⚠️ Mets ici TON Gmail + App Password (16 chars, générés sur
# https://myaccount.google.com/apppasswords après avoir activé
# la 2FA sur le compte Gmail).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ton.email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM="Bokoma-Store <no-reply@bokoma-store.com>"

# ─── ⚠️ IMPORTANT : URL du frontend (à remplir à l'étape 4)
# CLIENT_URL=https://bokoma-frontend-production.up.railway.app
```

> 💡 **Pour JWT secrets** : génère des clés aléatoires sécurisées :
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 3c. Domaine public

1. **Settings** → **Networking** → **Generate Domain**
2. Note l'URL générée (ex: `bokoma-backend-production.up.railway.app`)
3. Vérifie le healthcheck : `https://bokoma-backend-production.up.railway.app/api/v1/health`

---

## 🎨 Étape 4 — Service Frontend

### 4a. Ajouter le service

1. **+ New** → **GitHub Repo** → `Bokoma-Store`
2. **Settings** du nouveau service :
   - **Root Directory** : `bokoma_frontend`
   - **Watch Paths** : `bokoma_frontend/**`
   - **Start Command** : `node server.js`

### 4b. Variables d'environnement

```env
# ─── API Backend (l'URL notée à l'étape 3c) ───────────────
NEXT_PUBLIC_API_URL=https://bokoma-backend-production.up.railway.app/api/v1

# ─── URL du site ──────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://bokoma-frontend-production.up.railway.app
NEXT_PUBLIC_APP_NAME=Bokoma Store

# ─── Cloudinary ───────────────────────────────────────────
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dfinmurky
CLOUDINARY_CLOUD_NAME=dfinmurky
CLOUDINARY_API_KEY=899394629886434
CLOUDINARY_API_SECRET=xz7XZYt5knd30r7GWzEMY6DbSPI

# ─── Features ─────────────────────────────────────────────
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REVIEWS=true
NEXT_PUBLIC_ENABLE_WISHLIST=true

# ─── Debug ────────────────────────────────────────────────
NEXT_PUBLIC_DEBUG=false
```

### 4c. Domaine public

1. **Settings** → **Networking** → **Generate Domain**
2. URL finale du frontend : `https://bokoma-frontend-production.up.railway.app`

---

## 🔁 Étape 5 — Lier le CLIENT_URL au backend

Retourne sur le **service backend** → **Variables** → renseigne :

```env
CLIENT_URL=https://bokoma-frontend-production.up.railway.app
```

→ Le backend va **redémarrer automatiquement** avec la nouvelle config.

---

## ✅ Étape 6 — Tests

### Smoke tests

```bash
# 1. Backend health
curl https://bokoma-backend-production.up.railway.app/api/v1/health

# 2. Register un compte test
curl -X POST https://bokoma-backend-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com","password":"Test1234Pass"}'

# 3. Login
curl -X POST https://bokoma-backend-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@test.com","password":"Test1234Pass"}'

# 4. Test reset OTP (regarde ton email)
curl -X POST https://bokoma-backend-production.up.railway.app/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```

### Tests UI côté frontend

1. Ouvre `https://bokoma-frontend-production.up.railway.app`
2. **Compte** : register / login → vérifier les cookies
3. **Boutique** : naviguer, ajouter au panier
4. **Checkout** : passer commande → la popup CinetPay doit s'ouvrir centrée ✅
5. **Reset password** : aller sur `/auth/forgot-password`
   - Saisir email → "Code envoyé"
   - Entrer le code reçu par mail
   - Saisir nouveau mot de passe → "Réinitialisé" ✅
6. **Reset password (lien)** : vérifier que le lien dans l'email fonctionne toujours ✅

---

## 🐛 Étape 7 — Debug courant

### Voir les logs en direct
Railway dashboard → ton service → onglet **Deployments** → clique sur le déploiement → **View Logs**.

### Problèmes SMTP (emails OTP ne partent pas)
1. Vérifie que tu utilises un **App Password** Gmail (16 chars), pas ton mot de passe normal
2. 2FA doit être activée sur le compte Gmail pour générer un App Password
3. Si "less secure" est désactivé, c'est normal depuis 2022 : il faut OBLIGATOIREMENT un App Password
4. Alternative : utilise [Mailtrap.io](https://mailtrap.io) (gratuit) ou [Brevo](https://brevo.com) (gratuit jusqu'à 300 emails/jour)

### CORS bloqué après déploiement
Si le frontend ne peut pas appeler le backend :
1. Vérifie que `CLIENT_URL` côté backend est **exactement** l'URL du frontend Railway (sans trailing slash)
2. Le pattern `*.up.railway.app` est déjà autorisé, mais force la valeur explicite pour la prod

### MongoDB ne se connecte pas
1. Va sur [cloud.mongodb.com](https://cloud.mongodb.com) → ton cluster → **Network Access**
2. Ajoute `0.0.0.0/0` (autorise toutes les IPs — nécessaire pour Railway)
3. Attends 1-2 min que la propagation soit faite

---

## 💡 Étape 8 — Pour aller plus loin (optionnel)

### Domaine custom
1. **Settings** du service → **Networking** → **Custom Domain**
2. Exemple : `bokoma.shop` chez Namecheap / OVH (~10€/an)
3. Ajoute le CNAME fourni par Railway

### Monitoring
Railway fournit des metrics CPU/RAM/Network gratuites. Pour des alertes email/Slack, connecte [Cronitor](https://cronitor.io) au healthcheck.

### Sauvegardes DB
MongoDB Atlas (free M0) n'a pas de backups auto, mais tu peux utiliser :
```bash
mongodump --uri="$MONGO_URI" --out=./backup-$(date +%F)
```

---

## 📞 En cas de pépin

Si tu bloques sur une étape, balance-moi :
- L'URL Railway du service en question
- Le message d'erreur des logs (onglet Deployments → View Logs)

Et je te débloque en 2 minutes.

**Bon test !** 🚀
