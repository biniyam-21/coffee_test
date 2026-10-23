import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all inventory balances with product metadata and low-stock alerts.
   */
  async getInventoryList() {
    const inventories = await this.prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            basePriceCents: true,
            isActive: true,
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return inventories.map((inv) => ({
      id: inv.id,
      productId: inv.productId,
      product: inv.product,
      quantity: inv.quantity,
      lowStockThreshold: inv.lowStockThreshold,
      isLowStock: inv.quantity <= inv.lowStockThreshold,
      updatedAt: inv.updatedAt,
    }));
  }

  /**
   * Atomically adjusts product inventory with row-locking, stock movement logging, and audit tracking.
   */
  async adjustInventory(dto: AdjustInventoryDto, actorUserId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Acquire exclusive row lock
      const lockedRows = await tx.$queryRaw<
        Array<{ id: string; product_id: string; quantity: number }>
      >`
        SELECT id, product_id, quantity 
        FROM "inventory" 
        WHERE "product_id" = ${dto.productId}::uuid 
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundException(`Inventory record not found for product ${dto.productId}`);
      }

      const currentQuantity = lockedRows[0].quantity;
      const newQuantity = currentQuantity + dto.quantityDelta;

      // 2. Reject negative stock
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Adjustment of ${dto.quantityDelta} units would result in negative stock (${newQuantity}). Current: ${currentQuantity}`,
        );
      }

      // 3. Update inventory balance
      await tx.inventory.update({
        where: { productId: dto.productId },
        data: { quantity: newQuantity },
      });

      // 4. Record immutable StockMovement ledger row
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          userId: actorUserId || null,
          quantityDelta: dto.quantityDelta,
          balanceAfter: newQuantity,
          reason: dto.reason,
          notes: dto.notes || `Manual adjustment of ${dto.quantityDelta} units`,
        },
      });

      // 5. Record AuditEvent
      await tx.auditEvent.create({
        data: {
          userId: actorUserId || null,
          action: 'INVENTORY_ADJUSTED',
          entityName: 'Inventory',
          entityId: dto.productId,
          oldValues: { quantity: currentQuantity },
          newValues: {
            quantity: newQuantity,
            delta: dto.quantityDelta,
            reason: dto.reason,
          },
        },
      });

      return {
        productId: dto.productId,
        productName: product.name,
        previousQuantity: currentQuantity,
        newQuantity,
        stockMovementId: movement.id,
      };
    });
  }
}
