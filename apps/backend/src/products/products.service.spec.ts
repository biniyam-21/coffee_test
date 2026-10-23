import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../database/prisma.service';

interface MockProductsPrisma {
  product: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  category: { findUnique: jest.Mock; findMany: jest.Mock };
  inventory: { create: jest.Mock };
  stockMovement: { create: jest.Mock };
  auditEvent: { create: jest.Mock };
  $transaction: jest.Mock;
}

describe('ProductsService', () => {
  let service: ProductsService;
  let mockPrisma: MockProductsPrisma;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      inventory: {
        create: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      auditEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('should return paginated products with stock status', async () => {
      mockPrisma.product.count.mockResolvedValue(1);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'p-1',
          name: 'Espresso',
          slug: 'espresso',
          description: 'Rich shot',
          basePriceCents: 350,
          category: { id: 'c-1', name: 'Hot Coffee', slug: 'hot-coffee' },
          inventory: { quantity: 20, lowStockThreshold: 10 },
          createdAt: new Date(),
        },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].inventory.inStock).toBe(true);
      expect(result.data[0].inventory.availableQuantity).toBe(20);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return product details if active', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p-1',
        name: 'Pour Over',
        slug: 'pour-over',
        isActive: true,
        basePriceCents: 450,
        category: { id: 'c-1', name: 'Hot Coffee', slug: 'hot-coffee' },
        inventory: { quantity: 15, lowStockThreshold: 5 },
      });

      const product = await service.findById('p-1');
      expect(product.id).toBe('p-1');
      expect(product.basePriceCents).toBe(450);
    });

    it('should throw NotFoundException if product is not found or inactive', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create product with initial stock and audit event', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'c-1' });
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({
        id: 'p-new',
        name: 'Cold Brew',
        slug: 'cold-brew',
        basePriceCents: 500,
      });

      const result = await service.create(
        {
          categoryId: 'c-1',
          name: 'Cold Brew',
          slug: 'cold-brew',
          basePriceCents: 500,
          initialStock: 30,
        },
        'admin-user-id',
      );

      expect(mockPrisma.product.create).toHaveBeenCalled();
      expect(mockPrisma.inventory.create).toHaveBeenCalledWith({
        data: { productId: 'p-new', quantity: 30 },
      });
      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PRODUCT_CREATED',
          entityId: 'p-new',
        }),
      });
      expect(result.id).toBe('p-new');
    });

    it('should reject creation if slug already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'c-1' });
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-existing' });

      await expect(
        service.create({
          categoryId: 'c-1',
          name: 'Duplicate',
          slug: 'duplicate-slug',
          basePriceCents: 400,
          initialStock: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should log PRODUCT_PRICE_UPDATED audit event when price changes', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p-1',
        name: 'Latte',
        slug: 'latte',
        basePriceCents: 400,
        isActive: true,
      });
      mockPrisma.product.update.mockResolvedValue({
        id: 'p-1',
        name: 'Latte',
        basePriceCents: 450,
        isActive: true,
      });

      await service.update('p-1', { basePriceCents: 450 }, 'admin-id');

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PRODUCT_PRICE_UPDATED',
          entityId: 'p-1',
          oldValues: expect.objectContaining({ basePriceCents: 400 }),
          newValues: expect.objectContaining({ basePriceCents: 450 }),
        }),
      });
    });
  });
});
