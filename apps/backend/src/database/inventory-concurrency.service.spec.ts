import { Test, TestingModule } from '@nestjs/testing';
import {
  InventoryConcurrencyService,
  InsufficientStockException,
} from './inventory-concurrency.service';
import { PrismaService } from './prisma.service';
import { StockMovementReason } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

type MockTx = {
  $queryRaw: jest.Mock;
  inventory: {
    update: jest.Mock;
  };
  stockMovement: {
    create: jest.Mock;
  };
};

describe('InventoryConcurrencyService (Pessimistic Locking & Atomic Ledger)', () => {
  let service: InventoryConcurrencyService;
  let mockPrisma: {
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn(async (callback: (tx: MockTx) => Promise<unknown>) => {
        const tx: MockTx = {
          $queryRaw: jest.fn(),
          inventory: {
            update: jest.fn(),
          },
          stockMovement: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryConcurrencyService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<InventoryConcurrencyService>(InventoryConcurrencyService);
  });

  it('should successfully reserve stock atomically when inventory is sufficient', async () => {
    const productId = '11111111-1111-1111-1111-111111111111';
    const userId = '22222222-2222-2222-2222-222222222222';

    // Mock transaction behavior
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: MockTx) => Promise<unknown>) => {
        const tx: MockTx = {
          $queryRaw: jest
            .fn()
            .mockResolvedValue([{ id: 'inv-1', product_id: productId, quantity: 15 }]),
          inventory: {
            update: jest.fn().mockResolvedValue({ productId, quantity: 12 }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({ id: 'sm-1', productId, quantityDelta: -3 }),
          },
        };
        return callback(tx);
      },
    );

    const results = await service.reserveStockAtomic(
      [{ productId, quantity: 3 }],
      userId,
      StockMovementReason.ORDER_RESERVATION,
    );

    expect(results).toHaveLength(1);
    expect(results[0].productId).toBe(productId);
    expect(results[0].previousQuantity).toBe(15);
    expect(results[0].newQuantity).toBe(12);
    expect(results[0].stockMovementId).toBe('sm-1');
  });

  it('should throw InsufficientStockException and abort transaction when requested > available', async () => {
    const productId = '11111111-1111-1111-1111-111111111111';

    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: MockTx) => Promise<unknown>) => {
        const tx: MockTx = {
          $queryRaw: jest
            .fn()
            .mockResolvedValue([{ id: 'inv-1', product_id: productId, quantity: 2 }]),
          inventory: { update: jest.fn() },
          stockMovement: { create: jest.fn() },
        };
        return callback(tx);
      },
    );

    await expect(service.reserveStockAtomic([{ productId, quantity: 5 }])).rejects.toThrow(
      InsufficientStockException,
    );
  });

  it('should reject non-positive reservation quantities with BadRequestException', async () => {
    const productId = '11111111-1111-1111-1111-111111111111';

    await expect(service.reserveStockAtomic([{ productId, quantity: 0 }])).rejects.toThrow(
      BadRequestException,
    );

    await expect(service.reserveStockAtomic([{ productId, quantity: -2 }])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should atomically restock inventory and record positive stock movement ledger entry', async () => {
    const productId = '11111111-1111-1111-1111-111111111111';

    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: MockTx) => Promise<unknown>) => {
        const tx: MockTx = {
          $queryRaw: jest
            .fn()
            .mockResolvedValue([{ id: 'inv-1', product_id: productId, quantity: 10 }]),
          inventory: {
            update: jest.fn().mockResolvedValue({ productId, quantity: 15 }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({ id: 'sm-restock', productId, quantityDelta: 5 }),
          },
        };
        return callback(tx);
      },
    );

    const result = await service.restockAtomic(productId, 5);

    expect(result.productId).toBe(productId);
    expect(result.previousQuantity).toBe(10);
    expect(result.newQuantity).toBe(15);
    expect(result.stockMovementId).toBe('sm-restock');
  });
});
