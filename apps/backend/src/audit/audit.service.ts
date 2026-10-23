import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus } from '@akufada/shared';
import { QueryAuditDto } from './dto/query-audit.dto';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves paginated audit events with actor metadata.
   */
  async findAuditEvents(query: QueryAuditDto) {
    const { entityName, action, userId, page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(entityName ? { entityName } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
    };

    const [total, events] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              roles: {
                select: {
                  role: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: events.map((e) => ({
        id: e.id,
        action: e.action,
        entityName: e.entityName,
        entityId: e.entityId,
        actor: e.user
          ? {
              id: e.user.id,
              name: e.user.fullName,
              email: e.user.email,
              role: (e.user as any).roles?.[0]?.role?.name || undefined,
            }
          : null,
        oldValues: e.oldValues,
        newValues: e.newValues,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        createdAt: e.createdAt,
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
   * Computes aggregated sales statistics, category performance, time-series metrics,
   * and top selling products for administrators.
   */
  async getSalesReport(query: QuerySalesReportDto) {
    const dateFilter = {
      ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
      ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
    };

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const orders = await this.prisma.order.findMany({
      where: hasDateFilter ? { createdAt: dateFilter } : undefined,
      include: {
        orderItems: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        user: {
          select: { id: true, fullName: true, email: true },
        },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;
    let cancelledOrders = 0;
    let grossRevenueCents = 0;
    let netRevenueCents = 0;
    let taxCents = 0;

    const productStats = new Map<
      string,
      {
        name: string;
        categoryName: string;
        imageUrl: string | null;
        unitsSold: number;
        revenueCents: number;
      }
    >();

    const categoryStats = new Map<
      string,
      { name: string; unitsSold: number; revenueCents: number }
    >();

    const timeSeriesMap = new Map<
      string,
      { date: string; label: string; revenueCents: number; orderCount: number }
    >();

    for (const order of orders) {
      if (order.status === OrderStatus.CANCELLED) {
        cancelledOrders++;
        continue;
      }

      grossRevenueCents += order.totalCents;
      netRevenueCents += order.subtotalCents;
      taxCents += order.taxCents;

      // Group by date (YYYY-MM-DD)
      const d = new Date(order.createdAt);
      if (!Number.isNaN(d.getTime())) {
        const dateKey = d.toISOString().split('T')[0];
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const dateLabel = `${monthNames[d.getMonth()]} ${d.getDate()}`;

        const existingTime = timeSeriesMap.get(dateKey) || {
          date: dateKey,
          label: dateLabel,
          revenueCents: 0,
          orderCount: 0,
        };
        existingTime.revenueCents += order.totalCents;
        existingTime.orderCount += 1;
        timeSeriesMap.set(dateKey, existingTime);
      }

      for (const item of order.orderItems) {
        const catName = item.product?.category?.name || 'Beverages';
        const img = item.product?.imageUrl || null;

        // Product stats
        const existingProd = productStats.get(item.productId) || {
          name: item.productNameSnapshot,
          categoryName: catName,
          imageUrl: img,
          unitsSold: 0,
          revenueCents: 0,
        };
        existingProd.unitsSold += item.quantity;
        existingProd.revenueCents += item.lineTotalCents;
        productStats.set(item.productId, existingProd);

        // Category stats
        const catKey = item.product?.categoryId || 'uncategorized';
        const existingCat = categoryStats.get(catKey) || {
          name: catName,
          unitsSold: 0,
          revenueCents: 0,
        };
        existingCat.unitsSold += item.quantity;
        existingCat.revenueCents += item.lineTotalCents;
        categoryStats.set(catKey, existingCat);
      }
    }

    const completedOrders = totalOrders - cancelledOrders;
    const averageOrderValueCents =
      completedOrders > 0 ? Math.round(grossRevenueCents / completedOrders) : 0;

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        productId,
        name: stats.name,
        categoryName: stats.categoryName,
        imageUrl: stats.imageUrl,
        unitsSold: stats.unitsSold,
        revenueCents: stats.revenueCents,
        shareOfSales:
          grossRevenueCents > 0
            ? Number(((stats.revenueCents / grossRevenueCents) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

    const categoryBreakdown = Array.from(categoryStats.entries())
      .map(([categoryId, stats]) => ({
        categoryId,
        name: stats.name,
        unitsSold: stats.unitsSold,
        revenueCents: stats.revenueCents,
        percentage:
          grossRevenueCents > 0
            ? Number(((stats.revenueCents / grossRevenueCents) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents);

    const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const recentSales = orders.slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt:
        o.createdAt instanceof Date && !Number.isNaN(o.createdAt.getTime())
          ? o.createdAt.toISOString()
          : null,
      status: o.status,
      totalCents: o.totalCents,
      subtotalCents: o.subtotalCents,
      itemsCount: o.orderItems.reduce((sum, it) => sum + it.quantity, 0),
      customerName: o.user?.fullName || 'Walk-in Guest',
      paymentMethod: o.payments?.[0]?.provider || 'MOCK_GATEWAY',
      paymentStatus: o.payments?.[0]?.status || 'SUCCESS',
    }));

    return {
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        grossRevenueCents,
        netRevenueCents,
        taxCents,
        averageOrderValueCents,
      },
      topProducts,
      categoryBreakdown,
      timeSeries,
      recentSales,
    };
  }
}
