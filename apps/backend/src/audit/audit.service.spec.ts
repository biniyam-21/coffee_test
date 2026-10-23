import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus } from '@akufada/shared';

interface MockAuditPrisma {
  auditEvent: { count: jest.Mock; findMany: jest.Mock };
  order: { findMany: jest.Mock };
}

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: MockAuditPrisma;

  beforeEach(async () => {
    mockPrisma = {
      auditEvent: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('findAuditEvents', () => {
    it('should return paginated audit logs with actor metadata', async () => {
      mockPrisma.auditEvent.count.mockResolvedValue(1);
      mockPrisma.auditEvent.findMany.mockResolvedValue([
        {
          id: 'ae-1',
          action: 'PRODUCT_PRICE_UPDATED',
          entityName: 'Product',
          entityId: 'p-1',
          user: { id: 'u-1', fullName: 'Admin User', email: 'admin@akufada.local' },
          oldValues: { basePriceCents: 400 },
          newValues: { basePriceCents: 450 },
          createdAt: new Date(),
        },
      ]);

      const result = await service.findAuditEvents({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('PRODUCT_PRICE_UPDATED');
      expect(result.data[0].actor?.name).toBe('Admin User');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getSalesReport', () => {
    it('should aggregate revenue, order counts, and top products excluding cancelled orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          status: OrderStatus.COMPLETED,
          totalCents: 1000,
          orderItems: [
            { productId: 'p-1', productNameSnapshot: 'Latte', quantity: 2, lineTotalCents: 1000 },
          ],
        },
        {
          id: 'ord-2',
          status: OrderStatus.CONFIRMED,
          totalCents: 500,
          orderItems: [
            { productId: 'p-2', productNameSnapshot: 'Espresso', quantity: 1, lineTotalCents: 500 },
          ],
        },
        {
          id: 'ord-cancelled',
          status: OrderStatus.CANCELLED,
          totalCents: 2000,
          orderItems: [
            { productId: 'p-1', productNameSnapshot: 'Latte', quantity: 4, lineTotalCents: 2000 },
          ],
        },
      ]);

      const report = await service.getSalesReport({});

      expect(report.summary.totalOrders).toBe(3);
      expect(report.summary.completedOrders).toBe(2);
      expect(report.summary.cancelledOrders).toBe(1);
      expect(report.summary.grossRevenueCents).toBe(1500); // 1000 + 500 (excludes cancelled)
      expect(report.summary.averageOrderValueCents).toBe(750); // 1500 / 2
      expect(report.topProducts[0].name).toBe('Latte');
      expect(report.topProducts[0].unitsSold).toBe(2);
    });
  });
});
