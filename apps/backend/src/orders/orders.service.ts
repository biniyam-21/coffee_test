import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { InventoryConcurrencyService } from '../database/inventory-concurrency.service';
import { IdempotencyService } from '../database/idempotency.service';
import { PaymentClientService } from '../payment/payment-client.service';
import { OrderStatus, RoleType, StockMovementReason, PaymentStatus } from '@akufada/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  customerNotes?: string | null;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
  payment: {
    transactionId?: string;
    status?: string;
    checkoutUrl?: string;
  };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // Permitted order lifecycle transitions
  private readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELLED],
    [OrderStatus.IN_PREPARATION]: [OrderStatus.READY_FOR_PICKUP],
    [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryConcurrencyService: InventoryConcurrencyService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paymentClientService: PaymentClientService,
  ) {}

  /**
   * Places a customer order with authoritative pricing, atomic inventory deduction, and idempotency protection.
   */
  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<OrderResponse> {
    let requestHash = '';
    if (idempotencyKey) {
      requestHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            userId,
            items: dto.items,
            notes: dto.customerNotes,
            provider: dto.payment?.provider || 'MOCK_GATEWAY',
          }),
        )
        .digest('hex');

      const acquireResult = await this.idempotencyService.acquireKey(
        idempotencyKey,
        userId,
        requestHash,
      );

      if (acquireResult.status === 'CACHED') {
        this.logger.log(`Serving cached response for idempotency key ${idempotencyKey}`);
        return acquireResult.responseBody as OrderResponse;
      }
    }

    try {
      if (new Set(dto.items.map((item) => item.productId)).size !== dto.items.length) {
        throw new BadRequestException('Each product must appear only once in the order');
      }
      // 1. Authoritative price lookup and product validation
      const productIds = dto.items.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Product with ID ${item.productId} is not available for purchase`,
          );
        }
      }

      // 2. Authoritative monetary calculations (Exact Integer Cents)
      let subtotalCents = 0;
      const orderItemsData = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const lineTotalCents = product.basePriceCents * item.quantity;
        subtotalCents += lineTotalCents;

        return {
          productId: product.id,
          productNameSnapshot: product.name,
          unitPriceCents: product.basePriceCents,
          quantity: item.quantity,
          lineTotalCents,
        };
      });

      const taxCents = Math.round(subtotalCents * 0.1); // 10% standard tax
      const totalCents = subtotalCents + taxCents;

      // 3. Initialize payment with the selected server-side provider.
      const provider = dto.payment?.provider || 'MOCK_GATEWAY';
      const isCash = provider === 'CASH_ON_PICKUP';
      const isChapa = provider === 'CHAPA';
      const isMock = provider === 'MOCK_GATEWAY';
      const paymentProvider = provider;
      const paymentStatus = isCash || isChapa ? PaymentStatus.PENDING : PaymentStatus.SUCCESS;
      let paymentTxId = isCash ? `cash_${crypto.randomUUID()}` : '';
      let checkoutUrl: string | undefined;

      if (isChapa) {
        const callbackUrl = process.env.CHAPA_CALLBACK_URL?.trim();
        const returnUrl = process.env.CHAPA_RETURN_URL?.trim();
        if (!callbackUrl || !returnUrl) {
          throw new BadRequestException('Chapa requires CHAPA_CALLBACK_URL and CHAPA_RETURN_URL configuration');
        }
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, fullName: true },
        });
        if (!user) throw new NotFoundException('Customer account not found');
        const [firstName, ...lastNameParts] = user.fullName.trim().split(/\s+/);
        const txSuffix = idempotencyKey
          ? crypto.createHash('sha256').update(`${userId}:${idempotencyKey}`).digest('hex').slice(0, 32)
          : crypto.randomUUID().replace(/-/g, '');
        const initialized = await this.paymentClientService.initializeChapa({
          amount: (totalCents / 100).toFixed(2),
          currency: 'ETB',
          email: user.email,
          firstName: firstName || 'Customer',
          lastName: lastNameParts.join(' ') || 'Akufada',
          txRef: `akufada_${txSuffix}`,
          callbackUrl,
          returnUrl: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}tx_ref=akufada_${txSuffix}`,
        });
        paymentTxId = initialized.txRef;
        checkoutUrl = initialized.checkoutUrl;
      } else if (isMock) {
        if (dto.payment?.simulateOutcome === 'DECLINED') {
          throw new BadRequestException('Test payment was declined. Choose another payment method to continue.');
        }
        // Sandbox success is simulated locally. Chapa is the only provider that calls an external payment API.
        paymentTxId = `mock_${crypto.randomUUID()}`;
      } else if (!isCash) {
        throw new BadRequestException('Unsupported payment provider');
      }

      // 4. Atomic Execution: Inventory reservation & Order persistence
      const result = await this.prisma.$transaction(async (tx) => {
        // Reserve stock using pessimistic row locking
        await this.inventoryConcurrencyService.reserveStockAtomic(
          dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          userId,
          StockMovementReason.ORDER_RESERVATION,
          tx,
        );

        const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(
          1000 + Math.random() * 9000,
        )}`;

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: isChapa ? OrderStatus.PENDING : OrderStatus.CONFIRMED,
            subtotalCents,
            taxCents,
            totalCents,
            customerNotes: dto.customerNotes || null,
            orderItems: {
              create: orderItemsData,
            },
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: isChapa ? OrderStatus.PENDING : OrderStatus.CONFIRMED,
                reason: isChapa ? 'Awaiting Chapa payment verification' : 'Order placed by customer',
              },
            },
            payments: {
              create: {
                transactionId: paymentTxId,
                provider: paymentProvider,
                amountCents: totalCents,
                // The generated Prisma client may be stale until prisma generate runs after migrations.
                status: paymentStatus as unknown as PrismaPaymentStatus,
              },
            },
          },
          include: {
            orderItems: true,
            payments: true,
          },
        });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status as unknown as OrderStatus,
          subtotalCents: order.subtotalCents,
          taxCents: order.taxCents,
          totalCents: order.totalCents,
          customerNotes: order.customerNotes,
          createdAt: order.createdAt,
          items: order.orderItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productNameSnapshot,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            lineTotalCents: item.lineTotalCents,
          })),
          payment: {
            transactionId: order.payments[0]?.transactionId,
            status: order.payments[0]?.status,
            provider: order.payments[0]?.provider,
            ...(checkoutUrl ? { checkoutUrl } : {}),
          },
        };
      });

      if (idempotencyKey) {
        await this.idempotencyService.completeKey(idempotencyKey, 201, result);
      }

      return result;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.failKey(idempotencyKey);
      }
      throw error;
    }
  }

  /**
   * Retrieves paginated orders (customer own orders or all café orders for staff/admin).
   */
  async findUserOrders(
    userId: string,
    query: QueryOrdersDto,
    roles: RoleType[] = [RoleType.CUSTOMER],
  ) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      paymentStatus,
      paymentMethod,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const isAdminOrStaff = roles.includes(RoleType.ADMIN) || roles.includes(RoleType.STAFF);

    const where: any = {
      ...(isAdminOrStaff ? {} : { userId }),
      ...(status ? { status } : {}),
    };

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (paymentStatus) {
      where.payments = {
        some: { status: paymentStatus },
      };
    }

    if (paymentMethod) {
      where.payments = {
        some: { provider: paymentMethod },
      };
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
          user: {
            select: { id: true, fullName: true, email: true, phoneNumber: true },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
            select: { fromStatus: true, toStatus: true, reason: true, createdAt: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        subtotalCents: o.subtotalCents,
        taxCents: o.taxCents,
        totalCents: o.totalCents,
        customerNotes: o.customerNotes,
        itemCount: o.orderItems.reduce((acc, it) => acc + it.quantity, 0),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        customer: o.user
          ? {
              id: o.user.id,
              fullName: o.user.fullName,
              email: o.user.email,
              phoneNumber: o.user.phoneNumber,
            }
          : null,
        payment: o.payments[0]
          ? {
              transactionId: o.payments[0].transactionId,
              status: o.payments[0].status,
              provider: o.payments[0].provider,
              amountCents: o.payments[0].amountCents,
            }
          : undefined,
        payments: o.payments.map((p) => ({
          id: p.id,
          transactionId: p.transactionId,
          status: p.status,
          provider: p.provider,
          amountCents: p.amountCents,
          createdAt: p.createdAt,
        })),
        statusHistory: o.statusHistory.map((s) => ({
          fromStatus: s.fromStatus,
          toStatus: s.toStatus,
          reason: s.reason,
          createdAt: s.createdAt,
        })),
        items: o.orderItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productNameSnapshot,
          categoryName: i.product?.category?.name,
          imageUrl: i.product?.imageUrl,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents,
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieves single order by ID with ownership enforcement.
   */
  async findOrderById(orderId: string, userId: string, roles: RoleType[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const isStaffOrAdmin = roles.includes(RoleType.STAFF) || roles.includes(RoleType.ADMIN);
    if (!isStaffOrAdmin && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      customerNotes: order.customerNotes,
      createdAt: order.createdAt,
      items: order.orderItems.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productNameSnapshot,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
        lineTotalCents: i.lineTotalCents,
      })),
      timeline: order.statusHistory.map((h) => ({
        status: h.toStatus,
        reason: h.reason,
        timestamp: h.createdAt,
      })),
      payment: order.payments[0]
        ? {
            transactionId: order.payments[0].transactionId,
            status: order.payments[0].status,
            provider: order.payments[0].provider,
            amountCents: order.payments[0].amountCents,
          }
        : undefined,
    };
  }

  /**
   * Retrieves chronological tracking timeline for an order.
   */
  async trackOrder(orderId: string, userId: string, roles: RoleType[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const isStaffOrAdmin = roles.includes(RoleType.STAFF) || roles.includes(RoleType.ADMIN);
    if (!isStaffOrAdmin && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      timeline: order.statusHistory.map((h) => ({
        status: h.toStatus,
        reason: h.reason,
        timestamp: h.createdAt,
      })),
    };
  }

  /**
   * Cancels order and restores inventory if order has not yet entered preparation.
   */
  async cancelOrder(orderId: string, userId: string, roles: RoleType[], reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, payments: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const isStaffOrAdmin = roles.includes(RoleType.STAFF) || roles.includes(RoleType.ADMIN);
    if (!isStaffOrAdmin && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (order.payments.some((payment) => payment.provider === 'CHAPA')) {
      throw new BadRequestException('Chapa payments cannot be cancelled in the app. Contact the café for payment or refund assistance.');
    }

    if (order.status === OrderStatus.IN_PREPARATION) {
      throw new BadRequestException(
        'Order is already being prepared by barista and cannot be cancelled',
      );
    }

    if (
      order.status === OrderStatus.READY_FOR_PICKUP ||
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(`Order cannot be cancelled in status: ${order.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark status as cancelled
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // 2. Refund inventory quantities atomically
      for (const item of order.orderItems) {
        const lockedRows = await tx.$queryRaw<
          Array<{ id: string; product_id: string; quantity: number }>
        >`
          SELECT id, product_id, quantity 
          FROM "inventory" 
          WHERE "product_id" = ${item.productId}::uuid 
          FOR UPDATE
        `;

        if (lockedRows && lockedRows.length > 0) {
          const newQty = lockedRows[0].quantity + item.quantity;
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: newQty },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId,
              quantityDelta: item.quantity,
              balanceAfter: newQty,
              reason: StockMovementReason.ORDER_CANCELLATION_REFUND,
              notes: `Refund from cancellation of order ${order.orderNumber}`,
            },
          });
        }
      }

      // 3. Record status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          changedByUserId: userId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          reason: reason || 'Order cancelled by customer',
        },
      });

      // 4. Audit Event
      await tx.auditEvent.create({
        data: {
          userId,
          action: 'ORDER_CANCELLED',
          entityName: 'Order',
          entityId: orderId,
          oldValues: { status: order.status },
          newValues: { status: OrderStatus.CANCELLED, reason },
        },
      });

      return {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        message: 'Order was successfully cancelled and reserved inventory refunded',
      };
    });
  }

  /**
   * Retrieves staff kitchen queue of active orders.
   */
  async findStaffQueue(statusFilter?: OrderStatus) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const statusWhere = statusFilter
      ? { status: statusFilter }
      : {
          OR: [
            {
              status: {
                in: [OrderStatus.CONFIRMED, OrderStatus.IN_PREPARATION, OrderStatus.READY_FOR_PICKUP],
              },
            },
            {
              status: OrderStatus.COMPLETED,
              updatedAt: { gte: startOfToday },
            },
          ],
        };

    const orders = await this.prisma.order.findMany({
      where: statusWhere,
      orderBy: { createdAt: 'asc' }, // FIFO queue
      include: {
        orderItems: true,
        user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: { fromStatus: true, toStatus: true, createdAt: true },
        },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customer: o.user,
      customerNotes: o.customerNotes,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      statusHistory: o.statusHistory,
      items: o.orderItems.map((i) => ({
        productName: i.productNameSnapshot,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
      })),
    }));
  }

  /**
   * Transitions order preparation status following strict state machine rules.
   */
  async updateOrderStatus(
    orderId: string,
    staffUserId: string,
    targetStatus: OrderStatus,
    notes?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const allowedNextStatuses = this.validTransitions[order.status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${targetStatus}. Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: targetStatus },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          changedByUserId: staffUserId,
          fromStatus: order.status,
          toStatus: targetStatus,
          reason: notes || `Status updated to ${targetStatus}`,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: staffUserId,
          action: 'ORDER_STATUS_TRANSITION',
          entityName: 'Order',
          entityId: orderId,
          oldValues: { status: order.status },
          newValues: { status: targetStatus, notes },
        },
      });

      return {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        previousStatus: order.status,
        currentStatus: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
      };
    });
  }
}
