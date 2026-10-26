import { RoleType, OrderStatus, StockMovementReason, PaymentStatus } from '@akufada/shared';

export { RoleType, OrderStatus, StockMovementReason, PaymentStatus };

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: RoleType[];
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
}

export interface ProductInventory {
  inStock: boolean;
  availableQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePriceCents: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: ProductInventory;
  createdAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  reason?: string | null;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  customerNotes?: string | null;
  createdAt: string;
  items: OrderItemDetail[];
  timeline?: OrderStatusHistoryItem[];
  payment?: {
    transactionId?: string;
    status?: PaymentStatus;
    provider?: 'MOCK_GATEWAY' | 'CASH_ON_PICKUP' | 'CHAPA' | string;
    checkoutUrl?: string;
  };
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
  correlationId?: string;
  timestamp?: string;
}
