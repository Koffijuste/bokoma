# ⚡ Quick Start Guide - Bokoma Frontend

Commencez à développer en **moins de 5 minutes**!

## 1️⃣ Installation (2 min)

```bash
# Entrer le dossier
cd Bokoma_Frontend

# Installer les dépendances
npm install

# Ou avec yarn
yarn install
```

## 2️⃣ Configuration (1 min)

```bash
# Copier le fichier d'environnement
cp .env.example .env.local
```

Modifier `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

## 3️⃣ Démarrer (1 min)

```bash
npm run dev
```

Ouvrir: **http://localhost:3000** 🎉

---

## 📁 Structure pour Débuter

```
Bokoma_Frontend/
├── app/                    # Pages & routes
│   ├── (public)/          # Pages publiques
│   ├── (admin)/           # Dashboard admin
│   └── layout.tsx         # Layout racine
├── components/
│   ├── shared/            # Navbar, ProductCard, etc.
│   └── ui/                # Button, Input, Modal, etc.
├── services/
│   └── index.ts           # API calls
├── store/
│   └── index.ts           # Zustand (Auth, Cart, UI)
├── types/
│   └── index.ts           # TypeScript interfaces
└── utils/
    └── helpers.ts         # Fonctions utilitaires
```

---

## 🎯 Pages à Tester

### Public
- **Home**: `http://localhost:3000/`
- **Products**: `http://localhost:3000/products`
- **Login**: `http://localhost:3000/auth/login`
- **Register**: `http://localhost:3000/auth/register`
- **Cart**: `http://localhost:3000/cart`
- **Profile**: `http://localhost:3000/profile`

### Admin
- **Dashboard**: `http://localhost:3000/dashboard`
- **Produits**: `http://localhost:3000/dashboard/products`
- **Catégories**: `http://localhost:3000/dashboard/categories`
- **Utilisateurs**: `http://localhost:3000/dashboard/users`

---

## 🔧 Commandes Utiles

```bash
# Type-checking
npm run type-check

# Linting
npm run lint

# Build
npm run build

# Production start
npm start

# Clean install
rm -rf node_modules package-lock.json && npm install
```

---

## 🎨 Modifier les Couleurs

Ouvrir `app/globals.css` et chercher:

```css
:root {
  --background: 10 9 9;      /* Change couleur fond */
  --foreground: 255 255 255;  /* Change couleur texte */
  --accent: 148 51 234;      /* Change couleur accent (violet) */
}
```

---

## 🧩 Créer un Nouveau Composant

### Component Example

```typescript
// components/shared/my-component.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MyComponentProps {
  title: string;
  description?: string;
}

export function MyComponent({ title, description }: MyComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 bg-card border border-border rounded-lg"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </motion.div>
  );
}
```

### Utiliser le Composant

```typescript
import { MyComponent } from '@/components/shared/my-component';

export default function Page() {
  return <MyComponent title="Hello" description="World" />;
}
```

---

## 🔗 Ajouter une API Call

```typescript
import { productApi } from '@/services';
import { useFetch } from '@/hooks';

export default function ProductsPage() {
  const { data, loading, error } = useFetch(() =>
    productApi.getProducts({ page: 1 })
  );

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur: {error.message}</p>;

  return (
    <div>
      {data?.data.map((product) => (
        <div key={product._id}>{product.name}</div>
      ))}
    </div>
  );
}
```

---

## 🏪 Accéder aux Stores Zustand

```typescript
import { useAuthStore, useCartStore, useUiStore } from '@/store';

export default function MyComponent() {
  // Auth Store
  const { user, isAuthenticated, login, logout } = useAuthStore();

  // Cart Store
  const { cartCount, addItem } = useCartStore();

  // UI Store
  const { isDarkMode, toggleDarkMode } = useUiStore();

  return (
    <div>
      <p>User: {user?.name}</p>
      <p>Cart: {cartCount}</p>
      <button onClick={toggleDarkMode}>
        Dark Mode: {isDarkMode ? 'On' : 'Off'}
      </button>
    </div>
  );
}
```

---

## 📝 Créer une Nouvelle Page

1. Créer le fichier: `app/(public)/my-page/page.tsx`

```typescript
export default function MyPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <h1 className="text-4xl font-bold">Ma Page</h1>
    </div>
  );
}
```

2. Page accessible à: `http://localhost:3000/my-page`

---

## 🔒 Routes Protégées

Pages automatiquement protégées par le middleware:
- `/profile` - Require login
- `/orders` - Require login
- `/checkout` - Require login
- `/dashboard/*` - Require admin role

Voir `middleware.ts` pour la configuration.

---

## 🎨 Utilisateur les Composants UI

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';

export default function Example() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* Button */}
      <Button onClick={() => setIsModalOpen(true)}>
        Ouvrir Modal
      </Button>

      {/* Input */}
      <Input
        label="Email"
        type="email"
        placeholder="vous@exemple.com"
        error={undefined}
      />

      {/* Select */}
      <Select
        label="Catégorie"
        options={[
          { value: 'electronics', label: 'Électronique' },
          { value: 'clothing', label: 'Vêtements' },
        ]}
      />

      {/* Badge */}
      <Badge variant="accent">New</Badge>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal Title"
        size="md"
      >
        <p>Modal content here</p>
      </Modal>
    </div>
  );
}
```

---

## 🐛 Debugging Tips

### 1. React DevTools
```bash
# Install React DevTools
npm install -g react-devtools

# Run in separate terminal
react-devtools
```

### 2. Console Logging
```typescript
// Debug mode
if (process.env.NEXT_PUBLIC_DEBUG) {
  console.log('Debug:', data);
}
```

### 3. Network Inspection
- F12 → Network tab
- Filter by XHR
- Check request headers & response

### 4. Storage Inspection
- F12 → Application tab
- Check localStorage & cookies

---

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel deploy --prod
```

---

## 📚 Documentation Complète

- 📖 [README.md](./README.md) - Vue complète
- 🔧 [SETUP.md](./SETUP.md) - Configuration détaillée
- 🤝 [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution
- 📋 [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Résumé projet
- ✅ [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Checklist déploiement

---

## ❓ FAQ

**Q: Où placer les images?**
A: Dans `public/` ou utiliser Cloudinary avec les URLs.

**Q: Comment ajouter une dépendance?**
A: `npm install package-name`

**Q: Les variables d'environnement ne se mettent pas à jour?**
A: Redémarrer le serveur: `npm run dev`

**Q: Le backend ne répond pas?**
A: Vérifier que `NEXT_PUBLIC_API_URL` est correcte.

**Q: Comment tester l'authentification?**
A: Utiliser la page `/auth/login` avec des credentials de test.

---

## 🎓 Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

**Vous êtes maintenant prêt à développer! 🎉**

Bon développement! 🚀
