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
  categoryName?: string;
  imageUrl?: string | null;
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
  updatedAt?: string;
  itemCount?: number;
  customer?: {
    id: string;
    fullName: string;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
  items: OrderItemDetail[];
  timeline?: OrderStatusHistoryItem[];
  statusHistory?: Array<{
    fromStatus?: OrderStatus | null;
    toStatus: OrderStatus;
    reason?: string | null;
    createdAt: string;
  }>;
  payment?: {
    transactionId?: string;
    status?: PaymentStatus | string;
    provider?: string;
    amountCents?: number;
    checkoutUrl?: string;
  };
  payments?: Array<{
    id?: string;
    transactionId?: string;
    status?: PaymentStatus | string;
    provider?: string;
    amountCents?: number;
    createdAt?: string;
  }>;
}

export interface StaffQueueOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    email?: string | null;
  };
  customerNotes?: string | null;
  totalCents: number;
  createdAt: string;
  updatedAt?: string;
  statusHistory?: Array<{
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    createdAt: string;
  }>;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceCents?: number;
  }>;
}

export interface InventoryItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    basePriceCents: number;
    isActive?: boolean;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  updatedAt: string;
}

export interface AuditEventItem {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface SalesReport {
  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    grossRevenueCents: number;
    netRevenueCents?: number;
    taxCents?: number;
    averageOrderValueCents: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    categoryName?: string;
    imageUrl?: string | null;
    unitsSold: number;
    revenueCents: number;
    shareOfSales?: number;
  }>;
  categoryBreakdown?: Array<{
    categoryId: string;
    name: string;
    unitsSold: number;
    revenueCents: number;
    percentage: number;
  }>;
  timeSeries?: Array<{
    date: string;
    label: string;
    revenueCents: number;
    orderCount: number;
  }>;
  recentSales?: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    status: OrderStatus;
    totalCents: number;
    subtotalCents: number;
    itemsCount: number;
    customerName: string;
    paymentMethod: string;
    paymentStatus: string;
  }>;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
  correlationId?: string;
  timestamp?: string;
}
