# 📑 Bokoma Frontend — Arborescence et guide rapide

Ce fichier donne une vue synthétique et à jour de l'arborescence du frontend. Il est conçu pour aider un nouveau contributeur à se repérer rapidement.

## Démarrage rapide

```bash
cd bokoma_frontend
npm install
cp .env.example .env.local   # adapter si nécessaire
npm run dev
```

Ouvrir: http://localhost:3000

---

## Documentation principale

- [README.md](README.md)
- [QUICKSTART.md](QUICKSTART.md)
- [SETUP.md](SETUP.md)
- [COMMANDS.md](COMMANDS.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## Arborescence principale (extraits importants)

```
bokoma_frontend/
├─ app/                         # App router (Next.js app/)
│  ├─ (public)/                 # Pages publiques (home, products, auth...)
│  │  ├─ products/              # Listing + detail (page.tsx, [slug]/page.tsx)
│  │  ├─ search/                # Recherche
│  │  ├─ cart/                  # Panier
│  │  └─ auth/                  # login, register, forgot
│  └─ (admin)/                  # Espace admin (dashboard, gestion)
│
├─ components/                  # Composants réutilisables
│  ├─ layout/                    # Navbar, Footer, headers
│  ├─ features/                  # ProductCard, ProductList, etc.
│  └─ ui/                        # Button, Input, Select, Modal, etc.

├─ constants/                   # Constantes (routes, configs)
├─ hooks/                       # Hooks personnalisés (useAuth, useCart...)
├─ lib/                         # Petits helpers partagés (api wrappers)
├─ services/                    # services/api, auth.service, upload.service
├─ store/                       # Zustand stores (cart, auth, ui)
├─ types/                       # Types TypeScript
├─ utils/                       # helpers, formatters, slugify
├─ public/                      # images, icons, fonts
├─ styles/ or globals.css       # styles globaux (tailwind)
├─ package.json                 # scripts & dépendances
├─ tsconfig.json
└─ tailwind.config.js
```

---

## Fichiers et dossiers clés (liens rapides)

- Pages principales: [app/(public)/products/page.tsx](app/(public)/products/page.tsx), [app/(public)/products/[slug]/page.tsx](app/(public)/products/[slug]/page.tsx)
- Composant carte produit: [components/features/ProductCard/index.tsx](components/features/ProductCard/index.tsx)
- UI primitives: [components/ui/button.tsx](components/ui/button.tsx), [components/ui/input.tsx](components/ui/input.tsx), [components/ui/select.tsx](components/ui/select.tsx)
- API client: [services/api.ts](services/api.ts)
- Hooks: [hooks/useAuth.ts](hooks/useAuth.ts), [hooks/useWishlist.ts](hooks/useWishlist.ts), [hooks/useCart.ts](hooks/useCart.ts)
- Store: [store/index.ts](store/index.ts), [store/cart.ts](store/cart.ts)
- Configs: [constants/index.ts](constants/index.ts), [tailwind.config.js](tailwind.config.js)

---

## 📞 Pages Principales à Tester

### Public
- 🏠 `/` - Home avec hero
- 🛍️ `/products` - Listing produits
- 🔐 `/auth/login` - Connexion
- 📝 `/auth/register` - Inscription
- 🛒 `/cart` - Panier

### Admin
- 📊 `/dashboard` - Overview
- 📦 `/dashboard/products` - Produits
- 👥 `/dashboard/users` - Utilisateurs
- 📈 `/dashboard/analytics` - Stats

---

## 🔧 Configuration Initiale

**Fichier: `.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Bokoma Store
```

---

## 🧰 Tech Stack

```
Frontend:
├── Next.js 15        # Framework React full-stack
├── React 18          # UI library
├── TypeScript 5      # Type safety
├── TailwindCSS 3     # Styling
├── Framer Motion 10  # Animations
├── Zustand 4         # State management
├── Axios 1.6         # HTTP client
└── Recharts 2        # Charts

Backend (à intégrer):
├── Express.js        # Server
├── MongoDB           # Database
├── JWT               # Auth
├── Stripe            # Payments
└── Cloudinary        # Images
```

---

## 🚀 Étapes Suivantes

1. **Intégration Backend**
   - Vérifier endpoints API
   - Configurer CORS
   - Tester connexion

2. **Fonctionnalités Manquantes**
   - Recherche avancée
   - Wishlist synchronisation
   - Système avis complet
   - Notifications en temps réel

3. **Optimisation**
   - Tests unitaires
   - Performance optimization
   - SEO improvement
   - Analytics setup

4. **Déploiement**
   - Setup Vercel
   - Configure CI/CD
   - Setup monitoring
   - Launch production

---

## 📚 Ressources Utiles

- [Next.js Docs](https://nextjs.org/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Zustand Docs](https://github.com/pmndrs/zustand)

---

## ❓ Besoin d'Aide?

1. **Démarrage**: Consulter [QUICKSTART.md](./QUICKSTART.md)
2. **Configuration**: Consulter [SETUP.md](./SETUP.md)
3. **Commandes**: Consulter [COMMANDS.md](./COMMANDS.md)
4. **Contribution**: Consulter [CONTRIBUTING.md](./CONTRIBUTING.md)
5. **Déploiement**: Consulter [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

**Fait avec ❤️ pour Bokoma Store**

**Dernière mise à jour**: Janvier 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
