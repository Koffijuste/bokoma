# Bokoma-Store — Backend (Express + MongoDB)

## Présentation

API backend pour une boutique e‑commerce (produits, catégories, panier, commandes, avis, utilisateurs, coupons). Conçue avec : Node.js, Express, MongoDB (Mongoose), Cloudinary (uploads), Stripe (paiements), Nodemailer (emails).

**Principes** : sécurité minimale (helmet, rate-limit), validation avec `express-validator`, gestion d'erreurs centralisée (`AppError` + middleware), architecture MVC légère (routes → controllers → services → models).

## Installation rapide

- Cloner le dépôt et se placer dans le dossier backend.
- Installer les dépendances :

```bash
npm install
```

- Copier l'exemple d'env et remplir les variables :

```bash
cp .env.example .env
# puis éditer .env
```

- Démarrer :

```bash
npm start
# ou en dev avec nodemon : npm run dev
```

## Variables d'environnement principales

- **MONGO_URI** : connexion MongoDB
- **PORT** : port serveur (5000 par défaut)
- **CLIENT_URL** : URL frontend (CORS)
- **JWT_SECRET**, **JWT_EXPIRES_IN**
- **JWT_REFRESH_SECRET**, **JWT_REFRESH_EXPIRES_IN**
- **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASS**, **EMAIL_FROM** (envoi mails)
- **CLOUDINARY_CLOUD_NAME**, **CLOUDINARY_API_KEY**, **CLOUDINARY_API_SECRET**
- **STRIPE_SECRET_KEY**, **STRIPE_WEBHOOK_SECRET**
- **NODE_ENV**

## Structure du projet (résumé)

- **[src/server.js](src/server.js)** : point d'entrée — middlewares globaux, routes, connexion MongoDB.
- **[src/config](src/config)** : intégrations externes
    - [src/config/db.js](src/config/db.js)
    - [src/config/cloudinary.js](src/config/cloudinary.js)
    - [src/config/stripe.js](src/config/stripe.js)
- **[src/routes](src/routes)** : définitions des routes REST et protection
- **[src/controllers](src/controllers)** : logique HTTP (validation déjà faite) — actions CRUD et traitement métier
- **[src/models](src/models)** : schémas Mongoose (User, Product, Category, Cart, Order, Review, Coupon)
- **[src/services](src/services)** : utilitaires métiers (auth tokens, emails, paiement, upload, inventaire)
- **[src/middlewares](src/middlewares)** : protection, validation, upload, gestion d'erreurs
- **[src/utils](src/utils)** : helpers (`ApiFeatures`, `AppError`, `slugify`)
- **[src/validators](src/validators)** : règles `express-validator` pour endpoints critiques

## Principaux fichiers et logique

**Point d'entrée**
- [src/server.js](src/server.js) : configure helmet, cors, express.json, morgan, rate limiter, monte les routes et le middleware d'erreur, puis connecte MongoDB.

**Modèles (Mongoose)** — résumé
- [src/models/User.js](src/models/User.js) : utilisateurs, hash du mot de passe (`pre('save')`), méthodes `comparePassword()` et `toJSON()` pour exclure champs sensibles.
- [src/models/Product.js](src/models/Product.js) : produit avec `variants`, `images`, `attributes`, hooks pour calculer `totalStock` et index textuel pour recherche.
- [src/models/Category.js](src/models/Category.js) : catégories hiérarchiques (virtual `children`).
- [src/models/Cart.js](src/models/Cart.js) : panier par `user` ou `sessionId`, virtuals `total` et `itemCount`, TTL `expiresAt`.
- [src/models/Order.js](src/models/Order.js) : snapshot des items, paiement, historique de statuts et génération automatique de `orderNumber`.
- [src/models/Review.js](src/models/Review.js) : avis, unique par user+product, hook `post('save')` pour recalcul note produit.
- [src/models/Coupon.js](src/models/Coupon.js) : codes promo, contraintes (dates, usage limits, produits/catégories applicables).

**Controllers** — responsabilités clés
- `auth.controller.js` : enregistrement, login, refresh/logout, gestion reset mot de passe, route `GET /me`. Utilise `services/auth.service` et `email.service`.
- `user.controller.js` : profile, avatar upload + suppression via `upload.service`, gestion adresses, wishlist, endpoints admin pour lister/toggle users.
- `product.controller.js` : listing (avec `ApiFeatures`), recherche, création/édition/suppression produits, gestion images + variantes. Utilise `utils/slugify` pour générer slug unique et `upload.service` pour supprimer images.
- `category.controller.js` : CRUD catégories (désactivation plutôt que suppression), génération slug.
- `cart.controller.js` : logique panier (guest via `x-session-id` ou user connecté), ajout/upd/remove items, application de coupon (calcul discount).
- `order.controller.js` : checkout complet — vérification stock via `inventory.service`, calcul montants, création `PaymentIntent` via Stripe si carte, décrémentation stock, vidage panier, notifications email (non-bloquant).
- `review.controller.js` : création d'avis (vérifie achat), listing d'avis produits, approbation + marquage utile.
- `coupon.controller.js` : validation côté client et CRUD admin.

**Services** — logique métier réutilisable
- `auth.service.js` : création des `access` et `refresh` tokens JWT; `sendTokens()` stocke le refresh token en cookie httpOnly.
- `email.service.js` : templates HTML et envoi via Nodemailer (welcome, reset password, confirmation commande, update statut).
- `payment.service.js` : wrapper Stripe : `createPaymentIntent`, `refundPayment`, `constructWebhookEvent`.
- `inventory.service.js` : `checkAvailability`, `decrementStock`, `restoreStock` — opérations atomiques sur produits/variantes.
- `upload.service.js` : suppression d'images Cloudinary (`deleteImage`, `deleteImages`).

**Middlewares**
- `middlewares/auth.js` : `protect` (vérifie JWT, charge `req.user`) et `authorize(...roles)` pour restreindre routes.
- `middlewares/validate.js` : récupère erreurs `express-validator` et renvoie 422 avec détails.
- `middlewares/upload.js` : helpers pour `multer` + Cloudinary : `uploadSingle`, `uploadMultiple`.
- `middlewares/errorHandler.js` : centralise la réponse d'erreur; gère `CastError`, erreurs de validation Mongoose, erreurs JWT, codes 422/409/401/500.

**Utils importants**
- `utils/ApiFeatures.js` : construit dynamiquement une requête Mongoose depuis les query params (filter, search, sort, fields, paginate). Usage typique dans `product.controller.getProducts`.
- `utils/AppError.js` : classe d'erreur standard avec `statusCode` et `isOperational`.
- `utils/slugify.js` : `generateSlug(text, Model)` — génère un slug propre et ajoute suffixe si conflit (recherche existant par regex puis suffixe basé sur timestamp si nécessaire).

**Validators**
- [src/validators/auth.validator.js](src/validators/auth.validator.js)
- [src/validators/product.validator.js](src/validators/product.validator.js)
- [src/validators/order.validator.js](src/validators/order.validator.js)

## Routes principales (aperçu)

- Auth : `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/forgot-password`, `PATCH /api/v1/auth/reset-password/:token`, `GET /api/v1/auth/me` ([src/routes/auth.routes.js](src/routes/auth.routes.js)).
- Users : `GET/PATCH /api/v1/users/me`, avatar, adresses, wishlist, admin endpoints ([src/routes/user.routes.js](src/routes/user.routes.js)).
- Products : `GET /api/v1/products`, `GET /api/v1/products/:slug`, création/édition/suppression (admin) ([src/routes/product.routes.js](src/routes/product.routes.js)).
- Cart : `GET/POST/PATCH/DELETE /api/v1/cart` pour gérer panier guest ou user ([src/routes/cart.routes.js](src/routes/cart.routes.js)).
- Orders : `POST /api/v1/orders` (checkout), `GET /api/v1/orders/my`, admin gestion commandes ([src/routes/order.routes.js](src/routes/order.routes.js)).
- Reviews : `GET/POST /api/v1/products/:productId/reviews`, modération ([src/routes/review.routes.js](src/routes/review.routes.js)).
- Coupons : validation et CRUD admin ([src/routes/coupon.routes.js](src/routes/coupon.routes.js)).

## Comportements et bonnes pratiques

- Les opérations lourdes ou externes (envoi d'email, suppression Cloudinary) sont appelées de façon non-bloquante (promise.catch pour ne pas bloquer le flux principal).
- Les tokens refresh sont envoyés en cookie `httpOnly` ; l'access token est renvoyé en JSON pour usage côté client.
- Validation d'entrée structurée via `express-validator` et middleware `validate`.
- Utilisation d'indexes MongoDB (texte, slug, etc.) pour performance recherche.
- Gestion de stock via `inventory.service` pour éviter race conditions lors du checkout.

## Suggestions d'améliorations possibles

- Ajouter tests unitaires / d'intégration (Jest + supertest).
- Ajouter logging structuré (p.ex. Winston) et centraliser erreurs et metrics.
- Implémenter un système de jobs (Bull / Redis) pour tâches asynchrones (emails, sync stock lourd).
- Ajouter monitoring Webhooks Stripe robustes (endpoint sécurisé, vérification signature).
- Gestion avancée des rôles + ACL si besoin.

---

Si vous voulez, je peux :
- générer une version en anglais,
- ajouter un fichier `ENV.example` détaillé avec toutes les variables listées,
- ou détailler davantage une partie spécifique (ex : routes d'API, hooks Mongoose, tests).

Voulez-vous que j'ajoute d'autres détails ?

## Documentation détaillée des routes (endpoints)

Pour faciliter l'intégration frontend, voici la documentation détaillée des routes principales : méthode, chemin, authentification requise, paramètres et exemples minimaux.

- **Register**
    - Méthode : `POST`
    - Chemin : `/api/v1/auth/register`
    - Auth : non
    - Corps (JSON) : `{ "firstName":"John", "lastName":"Doe", "email":"john@example.com", "password":"Secret123" }`
    - Réponse : `{ success: true, accessToken, user }

- **Login**
    - Méthode : `POST`
    - Chemin : `/api/v1/auth/login`
    - Auth : non
    - Corps (JSON) : `{ "email":"john@example.com", "password":"Secret123" }`
    - Réponse : `{ success: true, accessToken, user }` (refreshToken dans cookie httpOnly)

- **Refresh token**
    - Méthode : `POST`
    - Chemin : `/api/v1/auth/refresh`
    - Auth : cookie `refreshToken`
    - Réponse : `{ success: true, accessToken }`

- **Get current user**
    - Méthode : `GET`
    - Chemin : `/api/v1/auth/me`
    - Auth : header `Authorization: Bearer <token>`
    - Réponse : `{ success: true, user }

- **Produits — liste & recherche**
    - Méthode : `GET`
    - Chemin : `/api/v1/products`
    - Auth : non
    - Query params utiles : `search`, `page`, `limit`, `sort`, `fields`, `category`, `type`, `minPrice`, `maxPrice`
    - Ex : `/api/v1/products?type=shoes&search=air&page=1&limit=12&sort=-basePrice`
    - Réponse : `{ success: true, total, results, page, limit, products[] }`

- **Produit — détail**
    - Méthode : `GET`
    - Chemin : `/api/v1/products/:slug`
    - Auth : non
    - Réponse : `{ success: true, product }

- **Créer produit** (admin/manager)
    - Méthode : `POST`
    - Chemin : `/api/v1/products`
    - Auth : `Authorization: Bearer <token>` (role `admin` ou `manager`)
    - Multipart form-data : `images[]` (fichiers), autres champs JSON (`name`, `description`, `category`, `type`, `basePrice`, ...)
    - Réponse : `{ success: true, product }`

- **Mettre à jour produit** (admin/manager)
    - Méthode : `PATCH`
    - Chemin : `/api/v1/products/:id`
    - Auth : admin/manager
    - Accepte multipart pour ajouter images ; renvoie le produit mis à jour.

- **Supprimer produit** (admin)
    - Méthode : `DELETE`
    - Chemin : `/api/v1/products/:id`
    - Auth : admin

- **Catégories — liste**
    - Méthode : `GET`
    - Chemin : `/api/v1/categories`
    - Auth : non
    - Réponse : `{ success: true, categories[] }` (retourne racines avec virtual `children`)

- **Créer catégorie** (admin)
    - Méthode : `POST`
    - Chemin : `/api/v1/categories`
    - Auth : admin
    - Corps : `{ name, parent? }`

- **Panier**
    - Récupérer panier : `GET /api/v1/cart` — auth optionnelle (guest via header `x-session-id`).
    - Ajouter item : `POST /api/v1/cart/items` — corps `{ product, variantId?, quantity? }`.
    - Mettre à jour quantité : `PATCH /api/v1/cart/items/:itemId` — `{ quantity }`.
    - Supprimer item : `DELETE /api/v1/cart/items/:itemId`.
    - Appliquer coupon : `POST /api/v1/cart/coupon` — `{ code }` (auth optionnelle).

- **Commandes / Checkout**
    - Créer commande : `POST /api/v1/orders` — Auth requise.
        - Corps type : `{ shipping: {...}, payment: { method: 'card'|'cash_on_delivery'|... }, notes? }`.
        - Le contrôleur vérifie stock (`inventory.service`), crée PaymentIntent si `card`, décrémente stock et vide le panier.
    - Lister mes commandes : `GET /api/v1/orders/my` — Auth requise.
    - Détails commande : `GET /api/v1/orders/:id` — Auth requise (propriétaire ou admin).
    - Mise à jour statut (admin/manager) : `PATCH /api/v1/orders/:id/status` — `{ status, note?, trackingNumber? }`.

- **Avis (Reviews)**
    - Lister : `GET /api/v1/products/:productId/reviews` — public.
    - Créer : `POST /api/v1/products/:productId/reviews` — auth requise, multipart possible pour images, vérifie achat (`isVerifiedPurchase`).
    - Supprimer / modérer : `DELETE /api/v1/reviews/:id`, `PATCH /api/v1/reviews/:id/approve` (admin).

- **Coupons**
    - Valider code (client) : `POST /api/v1/coupons/validate` — auth requise `{ code }`.
    - CRUD admin : `GET /api/v1/coupons`, `POST /api/v1/coupons`, `PATCH /api/v1/coupons/:id`, `DELETE /api/v1/coupons/:id`.

---
