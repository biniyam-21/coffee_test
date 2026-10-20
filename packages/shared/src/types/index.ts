import { RoleType, OrderStatus, PaymentStatus } from '../enums';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: RoleType[];
  isActive: boolean;
  createdAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
}

export interface ProductDto {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  basePriceCents: number;
  imageUrl?: string | null;
  isActive: boolean;
  category?: CategoryDto;
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  customerNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemDto[];
}

export interface HealthResponseDto {
  status: 'ok' | 'error';
  instance: string;
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  correlationId: string;
  timestamp: string;
  details?: ApiErrorDetail[];
}

export interface MockPaymentChargeRequest {
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  simulateOutcome?: PaymentStatus;
}

export interface MockPaymentChargeResponse {
  transactionId: string;
  amountCents: number;
  status: PaymentStatus;
  timestamp: string;
  failureReason?: string;
}
