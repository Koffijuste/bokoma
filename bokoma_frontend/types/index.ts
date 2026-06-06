// @/types/index.ts
// ============================================================================
// 📦 TYPES CENTRALISÉS - BOKOMA STORE
// ============================================================================

// ──────────────────────────────────────────────────────────────────────────
// 🔹 UTILITIES & HELPERS
// ──────────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'manager' | 'admin';
export type ProductType = 'shoes' | 'perfume' | 'clothing' | 'accessory';
export type PaymentMethod = 'card' | 'mobile_money' | 'cash_on_delivery' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partial'; // ✅ Ajout de 'partial'
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type DiscountType = 'percentage' | 'fixed';

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDelete {
  isActive: boolean;
  deletedAt?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 USER & AUTH
// ──────────────────────────────────────────────────────────────────────────

export interface Address {
  _id?: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  zipCode?: string;
  isDefault?: boolean;
}

export interface User extends Timestamps, SoftDelete {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: UserRole;
  isVerified: boolean;
  addresses: Address[];
  wishlist: string[];
  phone?: string;
  lastLogin?: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken?: string;
  user: User;
  tokenType: 'Bearer';
  expiresIn: string;
}

export type AuthResponse = ApiResponse<AuthPayload>;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
  phone?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 PRODUCT & CATALOG
// ──────────────────────────────────────────────────────────────────────────

export interface Image {
  url: string;
  publicId?: string;
  alt: string;
  isPrimary?: boolean;
  isUploaded?: boolean;
}

export interface Attribute {
  key: string;
  value: string;
}

export interface ProductVariant extends Timestamps {
  _id?: string;
  sku: string;
  size?: string;
  color?: string;
  stock: number;
  price?: number;
  images?: string[];
  isActive: boolean;
}

export interface ProductRating {
  average: number;
  count: number;
}

export interface ProductSEO {
  metaTitle?: string;
  metaDescription?: string;
}

export interface Product extends Timestamps, SoftDelete {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc?: string;
  basePrice: number;
  comparePrice?: number;
  currency: string;
  type: ProductType;
  brand?: string;
  category: Category | string;
  images: Image[];
  variants: ProductVariant[];
  attributes: Attribute[];
  tags: string[];
  rating: ProductRating;
  totalStock: number;
  soldCount: number;
  isFeatured: boolean;
  isNewProduct: boolean;
  seo?: ProductSEO;
  discountPercent?: number;
  inStock?: boolean;
  mainImage?: string;
}

export interface Category extends Timestamps, SoftDelete {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string | { url: string; alt?: string };
  parent?: string | Category;
  children?: Category[];
  isActive: boolean;
  order: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 CART & CHECKOUT
// ──────────────────────────────────────────────────────────────────────────

export interface CartItem extends Timestamps {
  _id: string;
  product: string | Product;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  variant?: string;
  size?: string;
  color?: string;
  sku?: string;
}

export interface CartCoupon {
  code: string;
  discount: number;
  type: DiscountType;
}

export interface Cart extends Timestamps {
  _id?: string;
  user?: string;
  sessionId?: string;
  items: CartItem[];
  coupon?: CartCoupon;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  itemCount: number;
  expiresAt?: string;
}

export interface AddToCartPayload {
  product: string;
  variantId?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 ORDERS — ✅ MISE À JOUR
// ──────────────────────────────────────────────────────────────────────────

export interface OrderItem {
  _id?: string;
  product: string | Product;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  size?: string;
  color?: string;
  image?: string;
  sku?: string;
  subtotal?: number; // ✅ Ajouté pour le calcul dans le frontend
}

export interface ShippingInfo {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  zipCode?: string;
  postalCode?: string; // ✅ Alias pour compatibilité
  deliveryInstructions?: string;
  trackingNumber?: string; // ✅ Ajouté pour le suivi
  deliveredAt?: string; // ✅ Date de livraison effective
  cost?: number; // ✅ Coût de livraison
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  provider?: string; // ✅ Stripe, Wave, etc.
  amountPaid?: number; // ✅ Pour paiement partiel (cash_on_delivery)
  metadata?: Record<string, any>;
}

export interface StatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order extends Timestamps {
  _id: string;
  orderNumber: string; // ✅ Numéro de commande lisible (ex: #ORD-2024-001)
  user: string | User;
  items: OrderItem[];
  shipping: ShippingInfo;
  billing?: ShippingInfo;
  payment: PaymentInfo;
  status: OrderStatus;
  statusHistory: StatusHistory[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency?: string; // ✅ Par défaut 'XOF'
  notes?: string;
  trackingNumber?: string; // ✅ Redondant avec shipping.trackingNumber pour accès facile
  estimatedDelivery?: string;
  coupon?: { // ✅ Info coupon appliquée
    _id: string;
    code: string;
    discount: number;
  };
  cancellationReason?: string; // ✅ Si annulée
  cancelledAt?: string; // ✅ Date d'annulation
}

export interface CreateOrderPayload {
  shipping: ShippingInfo;
  billing?: ShippingInfo;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  items: Array<{
    product: string;
    variant?: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 REVIEWS & RATINGS
// ──────────────────────────────────────────────────────────────────────────

export interface Review extends Timestamps {
  _id: string;
  product: string | Product;
  user: string | Pick<User, '_id' | 'firstName' | 'lastName' | 'avatar'>;
  rating: number;
  title: string;
  body: string;
  images?: Image[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  order?: string;
}

export interface CreateReviewPayload {
  product: string;
  rating: number;
  title: string;
  body: string;
  images?: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 COUPONS & PROMOTIONS
// ──────────────────────────────────────────────────────────────────────────

export interface Coupon extends Timestamps, SoftDelete {
  _id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  maxUsage?: number;
  currentUsage: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  userLimit?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export interface ApplyCouponPayload {
  code: string;
  cartTotal: number;
}

export interface CouponResponse {
  success: boolean;
  discount: number;
  coupon: Pick<Coupon, 'code' | 'discountType' | 'discountValue'>;
  message?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 API RESPONSES & UTILS
// ──────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
  statusCode?: number;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  isOperational: boolean;
  stack?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 FILTERS & QUERY PARAMS
// ──────────────────────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string;
  category?: string;
  type?: ProductType;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
  isFeatured?: boolean;
  sort?: '-createdAt' | 'createdAt' | '-basePrice' | 'basePrice' | 'name' | '-rating';
  page?: number;
  limit?: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  minTotal?: number;
  maxTotal?: number;
  sort?: '-createdAt' | 'createdAt' | '-total' | 'total';
  page?: number;
  limit?: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  sort?: '-createdAt' | 'createdAt' | 'lastName';
  page?: number;
  limit?: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 DASHBOARD & ANALYTICS
// ──────────────────────────────────────────────────────────────────────────

export interface SalesTrend {
  date: string;
  sales: number;
  orders: number;
  averageOrderValue: number;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: Array<Pick<Order, '_id' | 'orderNumber' | 'total' | 'status' | 'createdAt'>>;
  topProducts: Array<Pick<Product, '_id' | 'name' | 'mainImage' | 'basePrice' | 'soldCount'>>;
  salesTrend: SalesTrend[];
  revenueByCategory: Array<{ category: string; revenue: number }>;
}

export interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  granularity: 'day' | 'week' | 'month';
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 STORAGE & LOCAL STATE
// ──────────────────────────────────────────────────────────────────────────

export interface StoredAuth {
  accessToken: string;
  user: Pick<User, '_id' | 'firstName' | 'lastName' | 'email' | 'role' | 'avatar'>;
  expiresAt: number;
}

export interface CartState {
  items: Array<Pick<CartItem, '_id' | 'product' | 'name' | 'price' | 'quantity' | 'image' | 'size'>>;
  itemCount: number;
  subtotal: number;
}

// ──────────────────────────────────────────────────────────────────────────
// 🔹 REACT HOOKS & COMPONENTS
// ──────────────────────────────────────────────────────────────────────────

export interface UseFetchOptions<T> {
  immediate?: boolean;
  onError?: (error: ApiError) => void;
  onSuccess?: (data: T) => void;
}

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsePaginationResult<T> extends PaginationState {
  data: T[];
  loading: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setLimit: (limit: number) => void;
}