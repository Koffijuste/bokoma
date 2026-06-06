# Bokoma Store - Documentation Complète

## 📚 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Frontend](#frontend)
3. [Backend](#backend)
4. [Intégrations](#intégrations)
5. [Déploiement](#déploiement)

## 🎯 Vue d'ensemble

Bokoma Store est une plateforme e-commerce premium moderne construit avec les dernières technologies:

**Frontend:** Next.js 15, React 18, TailwindCSS, Framer Motion  
**Backend:** Express.js, MongoDB, JWT Auth, Stripe, Cloudinary  
**Déploiement:** Docker, Vercel, AWS 

### Architecture Globale

```
┌─────────────┐
│   Client    │
│ (Next.js)   │
└──────┬──────┘
       │ HTTP/REST
       ↓
┌──────────────────┐
│ Backend API      │
│ (Express.js)     │
└──────┬───────────┘
       │
       ├→ MongoDB
       ├→ Stripe API
       ├→ Cloudinary
       └→ Email Service
```

## 🚀 Frontend

### Installation

```bash
cd Bokoma_Frontend
npm install
npm run dev
```

Voir [SETUP.md](./SETUP.md) pour la configuration détaillée.

### Structure

```
app/
  ├── (public)/         # Pages publiques
  │   ├── home/
  │   ├── products/
  │   ├── auth/
  │   ├── cart/
  │   └── ...
  ├── (admin)/          # Dashboard admin
  │   ├── dashboard/
  │   ├── products/
  │   ├── users/
  │   └── ...
  └── layout.tsx

components/
  ├── shared/           # Composants réutilisables
  ├── ui/               # Composants UI basiques
  └── admin/            # Composants spécifiques admin

services/
  ├── api.ts            # Client Axios + intercepteurs
  └── index.ts          # Services par domaine

store/
  └── index.ts          # Zustand stores (Auth, Cart, UI)

types/
  └── index.ts          # Interfaces TypeScript

utils/
  └── helpers.ts        # Fonctions utilitaires

hooks/
  ├── useApi.ts
  ├── useAuth.ts
  ├── useCart.ts
  └── index.ts
```

### Pages Disponibles

#### Public
- **Home** (`/`) - Accueil avec hero section
- **Products** (`/products`) - Listing + filtres
- **Product Detail** (`/products/:slug`) - Détail produit
- **Categories** (`/categories`) - Navigation catégories
- **Search** (`/search`) - Recherche avancée
- **Cart** (`/cart`) - Panier d'achat
- **Checkout** (`/checkout`) - Processus de paiement
- **Login** (`/auth/login`) - Connexion
- **Register** (`/auth/register`) - Inscription
- **Forgot Password** (`/auth/forgot`) - Récupération mot de passe
- **Profile** (`/profile`) - Profil utilisateur
- **Orders** (`/orders`) - Historique commandes
- **Wishlist** (`/wishlist`) - Produits favoris

#### Admin (Protégées)
- **Dashboard** (`/dashboard`) - Accueil admin
- **Products** (`/dashboard/products`) - Gestion produits
- **Categories** (`/dashboard/categories`) - Gestion catégories
- **Users** (`/dashboard/users`) - Gestion utilisateurs
- **Orders** (`/dashboard/orders`) - Gestion commandes
- **Coupons** (`/dashboard/coupons`) - Gestion coupons
- **Reviews** (`/dashboard/reviews`) - Modération reviews
- **Analytics** (`/dashboard/analytics`) - Statistiques

### Authentification

```typescript
// Login
const { login, isLoading } = useAuthStore();
await login(email, password);

// Register
const { register } = useAuthStore();
await register({ firstName, lastName, email, password });

// Check Auth
const { isAuthenticated, user } = useAuthStore();

// Logout
const { logout } = useAuthStore();
logout();
```

### API Service

```typescript
import { productApi, orderApi, userApi } from '@/services';

// Récupérer produits
const products = await productApi.getProducts({ page: 1 });

// Créer commande
const order = await orderApi.createOrder(data);

// Récupérer profil
const profile = await userApi.getProfile();
```

## 🔧 Backend

### Configuration

Voir `c:\Users\Kaeloo\Desktop\Projets\Bokoma-Store\Bokoma_Backend\readme.md`

### Variables d'Environnement Backend

```env
# Server
PORT=5000
NODE_ENV=development
ORIGIN=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/bokoma
DB_NAME=bokoma

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
```

### Endpoints Principaux

#### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET /api/v1/auth/me
POST /api/v1/auth/forgot-password
PATCH /api/v1/auth/reset-password
```

#### Products
```
GET /api/v1/products
GET /api/v1/products/:slug
POST /api/v1/products (admin)
PATCH /api/v1/products/:id (admin)
DELETE /api/v1/products/:id (admin)
```

#### Orders
```
POST /api/v1/orders
GET /api/v1/orders/my
GET /api/v1/orders/:id
GET /api/v1/orders (admin)
PATCH /api/v1/orders/:id/status (admin)
```

#### Cart
```
GET /api/v1/cart
POST /api/v1/cart/items
PATCH /api/v1/cart/items/:itemId
DELETE /api/v1/cart/items/:itemId
POST /api/v1/cart/coupon
DELETE /api/v1/cart/coupon
```

### Models Database

#### User
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'customer' | 'admin' | 'manager';
  avatar?: string;
  phone?: string;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Product
```typescript
{
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  salePrice?: number;
  images: Image[];
  category: ObjectId;
  type: string;
  stock: number;
  variants?: Variant[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Order
```typescript
{
  orderNumber: string;
  user: ObjectId;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  shippingInfo: ShippingInfo;
  paymentInfo: PaymentInfo;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔌 Intégrations

### Stripe (Paiements)

```typescript
// Frontend
const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
const { error } = await stripe.confirmCardPayment(clientSecret);

// Backend
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
});
```

### Cloudinary (Images)

```typescript
// Frontend
const signature = await generateCloudinarySignature();
const uploadURL = 'https://api.cloudinary.com/v1_1/your_cloud/image/upload';

// Upload
const formData = new FormData();
formData.append('file', file);
formData.append('signature', signature);
const response = await fetch(uploadURL, { method: 'POST', body: formData });
```

### Email (Nodemailer)

```typescript
// Backend - Transactional Emails
await sendEmail({
  to: user.email,
  subject: 'Order Confirmation',
  template: 'order-confirmation',
  data: { orderNumber, items, total }
});
```

## 📦 Déploiement

### Frontend - Vercel

```bash
# Setup
vercel link

# Environment variables
vercel env add NEXT_PUBLIC_API_URL

# Deploy
vercel deploy --prod
```

### Backend - Docker + AWS

```bash
# Build Docker image
docker build -t bokoma-backend .

# Run locally
docker run -p 5000:5000 bokoma-backend

# Push to AWS ECR
aws ecr get-login-password | docker login --username AWS --password-stdin [YOUR_ECR_URL]
docker tag bokoma-backend:latest [YOUR_ECR_URL]/bokoma-backend:latest
docker push [YOUR_ECR_URL]/bokoma-backend:latest
```

### Database - MongoDB Atlas

1. Créer un cluster MongoDB Atlas
2. Obtenir la connection string
3. Ajouter dans variables d'environnement:

```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bokoma?retryWrites=true&w=majority
```

## 🧪 Testing

### Frontend Tests (À implémenter)

```bash
npm install --save-dev @testing-library/react jest @testing-library/jest-dom

npm test
```

### Backend Tests (À implémenter)

```bash
npm install --save-dev jest supertest

npm test
```

## 📊 Monitoring & Analytics

### Frontend
- Google Analytics
- Sentry (Error tracking)
- Vercel Analytics

### Backend
- Morgan (Logging)
- Sentry (Error tracking)
- MongoDB Atlas Monitoring

## 🔒 Sécurité

### Frontend
- ✅ JWT en localStorage + httpOnly cookies
- ✅ Protection CSRF tokens
- ✅ XSS Prevention (React)
- ✅ HTTPS forcé en production

### Backend
- ✅ Rate limiting
- ✅ Input validation/sanitization
- ✅ CORS configuré
- ✅ Helmet.js (Security headers)
- ✅ Password hashing (bcrypt)

## 📞 Support

### Issues & Bugs
Ouvrir une issue GitHub avec:
- Description du problème
- Étapes pour reproduire
- Screenshots

### Feature Requests
Proposer une feature avec:
- Description claire
- Cas d'usage
- Bénéfices

### Questions
Consulter:
- README.md du projet
- SETUP.md de configuration
- CONTRIBUTING.md pour contribuer

---

**Version**: 1.0.0  
**Last Updated**: Janvier 2024  
**Maintainers**: Bokoma Team
