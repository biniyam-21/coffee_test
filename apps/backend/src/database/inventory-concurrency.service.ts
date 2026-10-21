import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StockMovementReason, Prisma } from '@prisma/client';

export class InsufficientStockException extends BadRequestException {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`,
    );
  }
}

export interface StockReservationItem {
  productId: string;
  quantity: number;
}

export interface ReservationResult {
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  stockMovementId: string;
}

@Injectable()
export class InventoryConcurrencyService {
  private readonly logger = new Logger(InventoryConcurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically reserves stock for one or more items using pessimistic row-level locking (SELECT ... FOR UPDATE).
   * Guarantees zero overselling under high concurrency.
   *
   * @param items List of products and quantities to reserve
   * @param userId User or actor requesting reservation
   * @param reason Stock movement reason (default: ORDER_RESERVATION)
   * @returns List of reservation results with new balances and movement IDs
   */
  async reserveStockAtomic(
    items: StockReservationItem[],
    userId?: string,
    reason: StockMovementReason = StockMovementReason.ORDER_RESERVATION,
    txClient?: Prisma.TransactionClient,
  ): Promise<ReservationResult[]> {
    if (!items || items.length === 0) {
      return [];
    }

    // Sort product IDs deterministically to completely eliminate cross-transaction deadlocks
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));

    const executeInTransaction = async (
      tx: Prisma.TransactionClient,
    ): Promise<ReservationResult[]> => {
      const results: ReservationResult[] = [];

      for (const item of sortedItems) {
        if (item.quantity <= 0) {
          throw new BadRequestException(
            `Reservation quantity must be positive. Received: ${item.quantity}`,
          );
        }

        // 1. Acquire Pessimistic Row Lock on the specific Inventory record
        // SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE
        const lockedRows = await tx.$queryRaw<
          Array<{ id: string; product_id: string; quantity: number }>
        >`
          SELECT id, product_id, quantity 
          FROM "inventory" 
          WHERE "product_id" = ${item.productId}::uuid 
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new BadRequestException(`Inventory record not found for product ${item.productId}`);
        }

        const currentStock = lockedRows[0].quantity;

        // 2. Concurrency Safety Check: Is available balance sufficient?
        if (currentStock < item.quantity) {
          this.logger.warn(
            `Atomic reservation rejected: Product ${item.productId} has ${currentStock} in stock, requested ${item.quantity}.`,
          );
          throw new InsufficientStockException(item.productId, item.quantity, currentStock);
        }

        const updatedQuantity = currentStock - item.quantity;

        // 3. Atomically update inventory quantity
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: updatedQuantity },
        });

        // 4. Record immutable StockMovement ledger entry in the same ACID transaction
        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: userId || null,
            quantityDelta: -item.quantity,
            balanceAfter: updatedQuantity,
            reason,
            notes: `Atomic reservation of ${item.quantity} units`,
          },
        });

        results.push({
          productId: item.productId,
          previousQuantity: currentStock,
          newQuantity: updatedQuantity,
          stockMovementId: movement.id,
        });
      }

      return results;
    };

    // If already inside an existing parent transaction (e.g. order checkout), reuse it; otherwise create a new transaction
    if (txClient) {
      return executeInTransaction(txClient);
    } else {
      return this.prisma.$transaction(executeInTransaction, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 5000,
      });
    }
  }

  /**
   * Restocks inventory atomically (e.g. order cancellation refund or supplier restock).
   */
  async restockAtomic(
    productId: string,
    quantity: number,
    userId?: string,
    reason: StockMovementReason = StockMovementReason.ORDER_CANCELLATION_REFUND,
    notes?: string,
  ): Promise<ReservationResult> {
    if (quantity <= 0) {
      throw new BadRequestException(`Restock quantity must be positive. Received: ${quantity}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<
        Array<{ id: string; product_id: string; quantity: number }>
      >`
        SELECT id, product_id, quantity 
        FROM "inventory" 
        WHERE "product_id" = ${productId}::uuid 
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new BadRequestException(`Inventory record not found for product ${productId}`);
      }

      const currentStock = lockedRows[0].quantity;
      const updatedQuantity = currentStock + quantity;

      await tx.inventory.update({
        where: { productId },
        data: { quantity: updatedQuantity },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          userId: userId || null,
          quantityDelta: quantity,
          balanceAfter: updatedQuantity,
          reason,
          notes: notes || `Restock of ${quantity} units`,
        },
      });

      return {
        productId,
        previousQuantity: currentStock,
        newQuantity: updatedQuantity,
        stockMovementId: movement.id,
      };
    });
  }
}
