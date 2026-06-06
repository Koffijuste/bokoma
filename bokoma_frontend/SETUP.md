# Guide de Configuration - Bokoma Frontend

## Préalables

- **Node.js**: 18.17 ou plus récent
- **npm**: 8+ ou **yarn**: 3.6+
- **Git**: Pour cloner le repository

## Installation Initiale

### 1. Cloner le Repository

```bash
git clone https://github.com/yourusername/bokoma-frontend.git
cd Bokoma_Frontend
```

### 2. Installer les Dépendances

```bash
npm install
# ou
yarn install
```

### 3. Configurer les Variables d'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env.local
```

Modifier `.env.local` avec vos configuration:

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Bokoma Store

# Services Externes
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_xxx  # Pour paiements
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx       # Pour images

# Debug
NEXT_PUBLIC_DEBUG=false
```

## Démarrage du Serveur

### Mode Développement

```bash
npm run dev
# Accès: http://localhost:3000
```

### Build Production

```bash
npm run build
npm start
```

### Vérification du TypeScript

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Architecture de Configuration

### next.config.js
Configuration Next.js optimisée:
- Image optimization pour Cloudinary
- Redirect vers www (optional)
- Compression gzip

### tailwind.config.ts
- Mode sombre par défaut
- Couleurs personnalisées
- Animations custom
- Plugins utiles

### tsconfig.json
- Mode strict activé
- Path aliases configurés (@/*)
- Éclatement du code

### postcss.config.js
- TailwindCSS intégré
- Autoprefixer pour compatibilité

## Connexion Backend

### Configuration API

Le client Axios est configuré pour:
1. **JWT Authentication**: Token envoyé automatiquement
2. **Refresh Token**: Auto-renouvellement sur 401
3. **Error Handling**: Interception et traitement centralisé
4. **Base URL**: Utilise NEXT_PUBLIC_API_URL

### Endpoints de Base

L'API attend les endpoints suivants (voir backend):

```
GET/POST /auth/login
POST /auth/register
GET /products
GET /categories
POST /cart/items
POST /orders
```

### Tester la Connexion

```bash
# Dans la console du navigateur
fetch('http://localhost:5000/api/v1/products')
  .then(r => r.json())
  .then(console.log)
```

## Structure des Dossiers

```
app/
├── (public)/          # Routes publiques
├── (admin)/           # Routes admin protégées
└── layout.tsx         # Layout racine

components/
├── shared/            # Composants partagés
├── ui/                # Composants UI basiques
└── admin/             # Composants admin

services/
├── api.ts             # Client HTTP
└── index.ts           # Services API

store/
└── index.ts           # Zustand stores

types/
└── index.ts           # TypeScript interfaces

utils/
└── helpers.ts         # Fonctions utilitaires
```

## State Management (Zustand)

### Auth Store

```typescript
import { useAuthStore } from '@/store';

// Dans un composant
const { user, isAuthenticated, login, logout } = useAuthStore();
```

### Cart Store

```typescript
import { useCartStore } from '@/store';

const { cartCount, addItem } = useCartStore();
```

### UI Store

```typescript
import { useUiStore } from '@/store';

const { isDarkMode, toggleDarkMode } = useUiStore();
```

## API Service Usage

### Récupérer des Données

```typescript
import { productApi } from '@/services';
import { useFetch } from '@/hooks';

// Dans un composant
const { data, loading, error } = useFetch(() =>
  productApi.getProducts({ page: 1 })
);
```

### Créer/Modifier des Données

```typescript
import { orderApi } from '@/services';
import { useMutation } from '@/hooks';

const { mutate, isLoading } = useMutation((data) =>
  orderApi.createOrder(data)
);
```

## Middleware & Routes Protégées

### Routes Publiques
- `/` - Accueil
- `/products` - Listing produits
- `/auth/login` - Connexion
- `/auth/register` - Inscription

### Routes Protégées (Authentification Requise)
- `/profile` - Profil utilisateur
- `/orders` - Mes commandes
- `/checkout` - Paiement
- `/wishlist` - Favoris

### Routes Admin (Role: admin/manager)
- `/dashboard` - Dashboard
- `/dashboard/products` - Gestion produits
- `/dashboard/users` - Gestion utilisateurs

Middleware automatique en [`middleware.ts`](middleware.ts)

## Customisation du Thème

### Couleurs

Modifier dans `app/globals.css`:

```css
:root {
  --background: 10 9 9; /* RGB background color */
  --foreground: 255 255 255;
  --accent: 148 51 234; /* Violet principal */
}
```

Ou dans `tailwind.config.ts`:

```ts
colors: {
  accent: 'hsl(var(--accent) / <alpha-value>)',
}
```

### Fonts

Importer dans `app/layout.tsx`:

```ts
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({ weight: ['600', '700'] });
```

### Animations

Définies dans `globals.css`:

```css
@keyframes float-animation {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}
```

## Performance & Optimization

### Image Optimization

Next.js optimise automatiquement les images:

```tsx
import Image from 'next/image';

<Image
  src="/product.jpg"
  alt="Product"
  width={300}
  height={300}
  priority={false}
/>
```

### Code Splitting

Next.js App Router fait le code splitting automatiquement par route.

### CSS Critical

TailwindCSS génère le CSS critique uniquement.

## Debugging

### React DevTools
```bash
npm install -g react-devtools
react-devtools
```

### Network Debugging
1. Ouvrir F12 → Network tab
2. Filtrer par XHR
3. Vérifier les headers Authorization

### Console Logs

Activation du debug:
```env
NEXT_PUBLIC_DEBUG=true
```

## Dépannage Courant

### Erreur: "Cannot find module"
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur: "API not responding"
- Vérifier que le backend est démarré (port 5000)
- Vérifier NEXT_PUBLIC_API_URL dans .env.local
- Vérifier CORS dans backend

### Styles TailwindCSS ne s'appliquent pas
```bash
# Rebuild Tailwind
npx tailwindcss -i ./app/globals.css -o ./app/output.css
```

### AuthError: "Token not found"
- Vérifier que cookies sont activés
- Vérifier localStorage en DevTools
- Se reconnecter

## Déploiement

### Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t bokoma-frontend .
docker run -p 3000:3000 bokoma-frontend
```

## Support & Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

Pour des questions, consultez le README.md principal ou ouvrez une issue.
