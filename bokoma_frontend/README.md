# Bokoma Frontend - E-commerce Premium Next.js

Frontend moderne et premium pour l'e-commerce Bokoma Store, construit avec Next.js, TailwindCSS, Shadcn/UI et Framer Motion.

## 🎨 Caractéristiques

### Design & UI/UX
- ✅ Design minimaliste moderne avec glassmorphism
- ✅ Dégradés fluides et animations élégantes avec Framer Motion
- ✅ Palette sombre avec accents violet/bleu/cyan
- ✅ Responsive design mobile-first complet
- ✅ Micro-interactions et effects hover premium
- ✅ Ombres douces et coins arrondis modernes
- ✅ Mode sombre par défaut (dark mode ready)

### Pages Publiques
- 🏠 **Home** - Hero section immersive avec CTA
- 🛍️ **Products** - Listing avec filtres, recherche, pagination
- 🏷️ **Categories** - Navigation par catégories
- 🛒 **Cart** - Gestion du panier
- 💳 **Checkout** - Processus de paiement (prêt pour Stripe)
- 🔐 **Auth** - Login et Register avec validation
- 👤 **Profile** - Gestion du profil utilisateur
- 📦 **Orders** - Historique et suivi des commandes
- ❤️ **Wishlist** - Produits favoris
- 🔍 **Search** - Recherche avancée

### Dashboard Admin
- 📊 **Overview** - Statistiques et graphiques
- 📦 **Produits** - CRUD complet
- 🏷️ **Catégories** - Gestion hiérarchique
- 👥 **Utilisateurs** - Gestion des clients
- 🛒 **Commandes** - Suivi et gestion
- 🎟️ **Coupons** - Gestion des promotions
- 💬 **Avis** - Modération des reviews
- 📈 **Analytics** - Graphiques et rapports

### Composants Réutilisables
- 🎯 **Navbar** - Navigation responsive sticky
- 📱 **Sidebar Admin** - Navigation collapsible
- 🎴 **ProductCard** - Cards élégantes avec animations
- 🔘 **Button** - Variantes: primary, secondary, outline, ghost, destructive
- 📊 **Tables** - Tableaux dynamiques responsifs
- 🔔 **Toast Notifications** - Notifications élégantes (Sonner)
- 📄 **Skeleton Loaders** - Chargement fluide
- 📍 **Pagination** - Navigation pagée
- 🔍 **Search Bars** - Recherche interactive
- 🎚️ **Filters** - Filtres avancés
- 📭 **Empty States** - États vides élégants

### État & APIs
- ⚙️ **Zustand** - Gestion d'état globale
  - Store Auth (user, token, login/logout)
  - Store Cart (compteur, items)
  - Store UI (dark mode, sidebar)
- 🔗 **Axios** - Client HTTP avec intercepteurs
  - Authentification JWT automatique
  - Gestion des erreurs centralisée
  - Refresh token automatique
- 🪝 **Custom Hooks**
  - `useAuth()` - Authentification
  - `useCart()` - Gestion du panier
  - `useAsync()` - Requêtes asynchrones
  - `useMutation()` - Mutations
  - `useFetch()` - Récupération de données

### Sécurité
- 🔐 JWT authentication avec tokens httpOnly
- 🛡️ Protected routes (client-side)
- 🚫 Admin routes avec vérification de rôle
- 📝 Validation des formulaires complète
- ⚠️ Gestion des erreurs robuste

## 🚀 Installation & Setup

### Prérequis
- Node.js 18+
- npm ou yarn
- Variables d'environnement configurées

### Installation

```bash
# Cloner et entrer dans le dossier
cd Bokoma_Frontend

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local

# Modifier .env.local avec votre configuration
# NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Ouvrir http://localhost:3000 dans le navigateur
```

### Production

```bash
# Build optimisé
npm run build

# Démarrer le serveur
npm start

# Vérifier la syntaxe
npm run type-check
```

## 📁 Structure du Projet

```
Bokoma_Frontend/
├── app/
│   ├── (public)/              # Routes publiques
│   │   ├── home/              # Page d'accueil
│   │   ├── products/          # Listing produits
│   │   ├── auth/              # Login/Register
│   │   ├── cart/              # Panier
│   │   ├── checkout/          # Paiement
│   │   ├── profile/           # Profil utilisateur
│   │   ├── orders/            # Commandes
│   │   ├── wishlist/          # Favoris
│   │   ├── search/            # Recherche
│   │   └── layout.tsx         # Layout public
│   ├── (admin)/               # Routes admin
│   │   ├── dashboard/         # Dashboard overview
│   │   ├── products/          # Gestion produits
│   │   ├── categories/        # Gestion catégories
│   │   ├── users/             # Gestion utilisateurs
│   │   ├── orders/            # Gestion commandes
│   │   ├── coupons/           # Gestion coupons
│   │   ├── reviews/           # Modération reviews
│   │   ├── analytics/         # Statistiques
│   │   └── layout.tsx         # Layout admin
│   ├── globals.css            # Styles globaux + animations
│   ├── layout.tsx             # Layout racine
│   ├── page.tsx               # Redirect vers home
│   └── providers.tsx          # Providers (Themes, Toasts)
├── components/
│   ├── shared/                # Composants partagés
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   ├── admin-sidebar.tsx
│   │   ├── product-card.tsx
│   │   └── ...
│   ├── ui/                    # Composants UI basiques
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── admin/                 # Composants admin
│       ├── stats-card.tsx
│       ├── data-table.tsx
│       └── ...
├── hooks/                     # Custom Hooks
│   ├── useApi.ts
│   ├── useAuth.ts
│   ├── useCart.ts
│   └── index.ts
├── services/                  # Services API
│   ├── api.ts                 # Client Axios
│   └── index.ts               # Endpoints API
├── store/                     # Zustand stores
│   └── index.ts               # Auth, Cart, UI stores
├── types/                     # Types TypeScript
│   └── index.ts
├── utils/                     # Utilitaires
│   └── helpers.ts             # Functions utiles
├── constants/                 # Constantes
│   └── index.ts               # Routes, API, configs
├── middleware.ts              # Middleware Next.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
└── README.md
```

## 🎯 Endpoints API Intégrés

### Authentication
- `POST /auth/login` - Connexion
- `POST /auth/register` - Inscription
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Utilisateur courant
- `POST /auth/forgot-password` - Mot de passe oublié
- `PATCH /auth/reset-password` - Réinitialiser mot de passe

### Produits
- `GET /products` - Liste (avec filtres, pagination)
- `GET /products/:slug` - Détail produit
- `POST /products` - Créer (admin)
- `PATCH /products/:id` - Modifier (admin)
- `DELETE /products/:id` - Supprimer (admin)

### Catégories
- `GET /categories` - Liste
- `GET /categories/:id` - Détail
- `POST /categories` - Créer (admin)
- `PATCH /categories/:id` - Modifier (admin)
- `DELETE /categories/:id` - Supprimer (admin)

### Panier
- `GET /cart` - Récupérer le panier
- `POST /cart/items` - Ajouter item
- `PATCH /cart/items/:itemId` - Modifier item
- `DELETE /cart/items/:itemId` - Retirer item
- `POST /cart/coupon` - Appliquer coupon
- `DELETE /cart/coupon` - Retirer coupon

### Commandes
- `POST /orders` - Créer commande
- `GET /orders/my` - Mes commandes
- `GET /orders/:id` - Détail commande
- `GET /orders` - Toutes les commandes (admin)
- `PATCH /orders/:id/status` - Modifier statut (admin)
- `GET /orders/stats` - Statistiques (admin)

### Autres
- Reviews, Coupons, Utilisateurs - CRUD complet

## 🎨 Personnalisation

### Couleurs & Thème
Les couleurs se trouvent dans `app/globals.css` (variables CSS) et `tailwind.config.ts`:
- Primary: Violet/Purple
- Secondary: Blue/Cyan
- Accent: Violet
- Background: Très sombre (#0a0a0a)

### Animations
Animations Framer Motion configurées dans `app/globals.css`:
- `float-animation` - Effet flottant
- `glow` - Effet de lueur
- `pulse-glow` - Pulsation

### Fonts
- Inter: Défaut (lisibilité)
- Poppins: Bold/Headers (style)

## 📱 Responsive Design

- **Mobile** (320px+): Layout single-column, navbar adaptée
- **Tablet** (768px+): 2-column grids, sidebar caché
- **Desktop** (1024px+): 3+ column grids, sidebar visible

## 🔐 Authentification

### Flow d'Auth
1. Login/Register → JWT tokens
2. Access token stocké en memory
3. Refresh token en cookie httpOnly
4. Intercepteur ajoute Authorization header
5. Refresh auto si 401 + retry requête

### Protected Routes
- `/profile` - Require auth
- `/orders` - Require auth
- `/checkout` - Require auth
- `/dashboard/*` - Require admin/manager

## 📦 Dépendances Principales

```json
{
  "next": "^15.1.0",
  "react": "^18.3.1",
  "tailwindcss": "^3.4.1",
  "framer-motion": "^10.16.16",
  "lucide-react": "^0.292.0",
  "zustand": "^4.4.1",
  "axios": "^1.6.5",
  "react-hook-form": "^7.48.0",
  "sonner": "^1.2.3",
  "recharts": "^2.10.3",
  "next-themes": "^0.2.1"
}
```

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
# Lier le repo GitHub
vercel link

# Variables d'environnement
vercel env add NEXT_PUBLIC_API_URL

# Déployer
vercel deploy --prod
```

### Autre hébergement
```bash
npm run build
npm start
```

## 📝 Checklist d'Implémentation

- [x] Architecture Next.js App Router
- [x] Design système avec TailwindCSS + Shadcn/UI
- [x] Animations Framer Motion
- [x] State management Zustand
- [x] API service avec Axios
- [x] Authentication JWT
- [x] Types TypeScript complètes
- [x] Custom hooks réutilisables
- [x] Pages publiques principales
- [x] Dashboard admin avec graphiques
- [x] Responsive design mobile-first
- [ ] Tests unitaires (Jest + React Testing Library)
- [ ] E2E tests (Playwright/Cypress)
- [ ] SEO optimisé (Meta tags, Sitemap)
- [ ] Performance optimisée (Image optimization, Code splitting)
- [ ] Offline support (PWA)

## 🐛 Debugging

### Logs
```typescript
// Service API
console.log('Request:', request);
console.log('Response:', response);
```

### DevTools
- React DevTools
- Redux DevTools (pour Zustand)
- Next.js DevTools

### Network
- F12 → Network tab
- Vérifier les requêtes API
- Vérifier les headers Authorization

## 📞 Support

Pour les issues ou questions:
1. Vérifier la connexion backend
2. Vérifier les variables d'environnement
3. Consulter les logs navigateur
4. Vérifier l'API documentation

## 📄 License

MIT License - Libre d'utilisation et de modification.

---

**Bokoma Store Frontend v1.0** - 2024  
Built with ❤️ using Next.js, TailwindCSS & Framer Motion
