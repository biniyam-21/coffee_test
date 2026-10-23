import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../database/prisma.service';
import { StockMovementReason } from '@akufada/shared';

interface MockInventoryPrisma {
  product: { findUnique: jest.Mock };
  inventory: { findMany: jest.Mock; update: jest.Mock };
  stockMovement: { create: jest.Mock };
  auditEvent: { create: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
}

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: MockInventoryPrisma;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      auditEvent: {
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getInventoryList', () => {
    it('should return inventory items with low-stock flags', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          productId: 'p-1',
          quantity: 5,
          lowStockThreshold: 10,
          updatedAt: new Date(),
          product: { id: 'p-1', name: 'Beans' },
        },
      ]);

      const list = await service.getInventoryList();
      expect(list).toHaveLength(1);
      expect(list[0].isLowStock).toBe(true); // 5 <= 10
      expect(list[0].quantity).toBe(5);
    });
  });

  describe('adjustInventory', () => {
    it('should adjust inventory balance, create stock movement and audit event', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-1', name: 'Espresso Beans' });
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'inv-1', product_id: 'p-1', quantity: 20 }]);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'sm-1' });
      mockPrisma.auditEvent.create.mockResolvedValue({});

      const result = await service.adjustInventory(
        {
          productId: 'p-1',
          quantityDelta: 15,
          reason: StockMovementReason.RESTOCK_PURCHASE,
          notes: 'New roastery shipment',
        },
        'admin-id',
      );

      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'p-1' },
        data: { quantity: 35 },
      });
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'p-1',
          quantityDelta: 15,
          balanceAfter: 35,
          reason: StockMovementReason.RESTOCK_PURCHASE,
        }),
      });
      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'INVENTORY_ADJUSTED',
          entityId: 'p-1',
        }),
      });
      expect(result.newQuantity).toBe(35);
    });

    it('should reject adjustment that causes negative stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-1', name: 'Milk' });
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'inv-1', product_id: 'p-1', quantity: 5 }]);

      await expect(
        service.adjustInventory({
          productId: 'p-1',
          quantityDelta: -10, // Would be 5 - 10 = -5
          reason: StockMovementReason.DAMAGED_DISPOSAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
