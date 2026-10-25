import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../database/prisma.service';
import { InventoryConcurrencyService } from '../database/inventory-concurrency.service';
import { IdempotencyService } from '../database/idempotency.service';
import { OrderStatus, RoleType } from '@akufada/shared';

import { PaymentClientService } from '../payment/payment-client.service';

interface MockOrdersPrisma {
  product: { findMany: jest.Mock; findUnique: jest.Mock };
  order: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  orderStatusHistory: { create: jest.Mock };
  auditEvent: { create: jest.Mock };
  inventory: { update: jest.Mock };
  stockMovement: { create: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
}

interface MockInventoryConcurrency {
  reserveStockAtomic: jest.Mock;
  restockAtomic: jest.Mock;
}

interface MockIdempotency {
  acquireKey: jest.Mock;
  completeKey: jest.Mock;
  failKey: jest.Mock;
}

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: MockOrdersPrisma;
  let mockInventoryConcurrency: MockInventoryConcurrency;
  let mockIdempotency: MockIdempotency;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      auditEvent: {
        create: jest.fn(),
      },
      inventory: {
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockInventoryConcurrency = {
      reserveStockAtomic: jest.fn().mockResolvedValue([]),
      restockAtomic: jest.fn().mockResolvedValue({}),
    };

    mockIdempotency = {
      acquireKey: jest.fn().mockResolvedValue({ status: 'ACQUIRED', key: 'idem-1' }),
      completeKey: jest.fn().mockResolvedValue(undefined),
      failKey: jest.fn().mockResolvedValue(undefined),
    };

    const mockPaymentClient = {
      processCharge: jest.fn().mockImplementation((opts) => {
        if (opts.simulateOutcome === 'DECLINED') {
          return Promise.reject(
            new BadRequestException('Payment transaction was declined by the payment provider'),
          );
        }
        return Promise.resolve({
          transactionId: 'tx_mock_spec_123',
          amountCents: opts.amountCents,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryConcurrencyService, useValue: mockInventoryConcurrency },
        { provide: IdempotencyService, useValue: mockIdempotency },
        { provide: PaymentClientService, useValue: mockPaymentClient },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrder', () => {
    it('should compute authoritative price in cents, reserve stock atomically, and snapshot items', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p-1',
          name: 'Yirgacheffe Pour Over',
          basePriceCents: 450, // $4.50
          isActive: true,
        },
      ]);

      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-123',
        orderNumber: 'ORD-20261026-0001',
        status: OrderStatus.CONFIRMED,
        subtotalCents: 900,
        taxCents: 90,
        totalCents: 990,
        customerNotes: 'Extra hot',
        createdAt: new Date(),
        orderItems: [
          {
            id: 'item-1',
            productId: 'p-1',
            productNameSnapshot: 'Yirgacheffe Pour Over',
            unitPriceCents: 450,
            quantity: 2,
            lineTotalCents: 900,
          },
        ],
        payments: [{ transactionId: 'tx-1', status: 'SUCCESS' }],
      });

      const order = await service.createOrder(
        'user-1',
        {
          items: [{ productId: 'p-1', quantity: 2 }],
          customerNotes: 'Extra hot',
        },
        'idem-key-1',
      );

      // Verify authoritative pricing: 2 * 450 = 900 subtotal, 90 tax = 990 total cents
      expect(order.subtotalCents).toBe(900);
      expect(order.totalCents).toBe(990);
      expect(mockInventoryConcurrency.reserveStockAtomic).toHaveBeenCalledWith(
        [{ productId: 'p-1', quantity: 2 }],
        'user-1',
        expect.any(String),
        expect.anything(),
      );
      expect(mockIdempotency.completeKey).toHaveBeenCalledWith('idem-key-1', 201, order);
    });

    it('should rollback and reject order when payment simulation is DECLINED', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Coffee', basePriceCents: 400, isActive: true },
      ]);

      await expect(
        service.createOrder(
          'user-1',
          {
            items: [{ productId: 'p-1', quantity: 1 }],
            payment: { provider: 'MOCK_GATEWAY', simulateOutcome: 'DECLINED' },
          },
          'idem-key-declined',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.order.create).not.toHaveBeenCalled();
      expect(mockIdempotency.failKey).toHaveBeenCalledWith('idem-key-declined');
    });

    it('should record cash on pickup as pending rather than paid', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Coffee', basePriceCents: 400, isActive: true },
      ]);
      mockPrisma.order.create.mockResolvedValue({
        id: 'ord-cash',
        orderNumber: 'ORD-CASH-1',
        status: OrderStatus.CONFIRMED,
        subtotalCents: 400,
        taxCents: 40,
        totalCents: 440,
        createdAt: new Date(),
        orderItems: [],
        payments: [{ transactionId: 'cash_tx', status: 'PENDING' }],
      });

      const order = await service.createOrder('user-1', {
        items: [{ productId: 'p-1', quantity: 1 }],
        payment: { provider: 'CASH_ON_PICKUP' },
      });

      expect(order.payment.status).toBe('PENDING');
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payments: {
              create: expect.objectContaining({ provider: 'CASH_ON_PICKUP', status: 'PENDING' }),
            },
          }),
        }),
      );
    });
  });

  describe('findOrderById (Ownership Enforcement)', () => {
    it('should allow customer to view their own order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'cust-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.CONFIRMED,
        subtotalCents: 450,
        taxCents: 45,
        totalCents: 495,
        orderItems: [],
        statusHistory: [],
        payments: [],
      });

      const order = await service.findOrderById('ord-1', 'cust-1', [RoleType.CUSTOMER]);
      expect(order.id).toBe('ord-1');
    });

    it('should reject customer attempting to view another customers order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'victim-customer-id',
        orderItems: [],
        statusHistory: [],
        payments: [],
      });

      await expect(
        service.findOrderById('ord-1', 'attacker-customer-id', [RoleType.CUSTOMER]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow staff or admin to view any customer order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'cust-1',
        orderItems: [],
        statusHistory: [],
        payments: [],
      });

      const order = await service.findOrderById('ord-1', 'staff-id', [RoleType.STAFF]);
      expect(order.id).toBe('ord-1');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and refund inventory if status is CONFIRMED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'cust-1',
        status: OrderStatus.CONFIRMED,
        orderNumber: 'ORD-001',
        orderItems: [{ productId: 'p-1', quantity: 2 }],
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.CANCELLED,
      });
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'inv-1', product_id: 'p-1', quantity: 10 }]);

      const result = await service.cancelOrder('ord-1', 'cust-1', [RoleType.CUSTOMER]);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'p-1' },
        data: { quantity: 12 }, // 10 + 2 refunded
      });
      expect(mockPrisma.stockMovement.create).toHaveBeenCalled();
    });

    it('should reject cancellation if order is already IN_PREPARATION', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'cust-1',
        status: OrderStatus.IN_PREPARATION,
        orderItems: [],
      });

      await expect(service.cancelOrder('ord-1', 'cust-1', [RoleType.CUSTOMER])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateOrderStatus (State Machine)', () => {
    it('should allow valid transition from CONFIRMED to IN_PREPARATION', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CONFIRMED,
        orderNumber: 'ORD-001',
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.IN_PREPARATION,
        updatedAt: new Date(),
      });

      const result = await service.updateOrderStatus(
        'ord-1',
        'barista-id',
        OrderStatus.IN_PREPARATION,
        'Grinding beans',
      );

      expect(result.currentStatus).toBe(OrderStatus.IN_PREPARATION);
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: OrderStatus.IN_PREPARATION,
        }),
      });
    });

    it('should reject invalid transition from PENDING to COMPLETED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.PENDING,
      });

      await expect(
        service.updateOrderStatus('ord-1', 'staff-id', OrderStatus.COMPLETED),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
