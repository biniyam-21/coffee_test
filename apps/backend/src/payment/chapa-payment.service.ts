import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { OrderStatus, PaymentStatus, StockMovementReason } from '@akufada/shared';
import { PrismaService } from '../database/prisma.service';
import { PaymentClientService, ChapaVerification } from './payment-client.service';

type PaymentWithOrder = Prisma.PaymentRecordGetPayload<{
  include: { order: { include: { orderItems: true } } };
}>;

@Injectable()
export class ChapaPaymentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChapaPaymentService.name);
  private reconciliationTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: PaymentClientService,
  ) {}

  onModuleInit(): void {
    const interval = Number(process.env.CHAPA_RECONCILE_INTERVAL_MS || 300000);
    if (process.env.NODE_ENV === 'production' && Number.isFinite(interval) && interval >= 60000) {
      this.reconciliationTimer = setInterval(() => {
        void this.reconcilePending().catch((error: unknown) => {
          this.logger.error(`Chapa reconciliation run failed: ${this.errorName(error)}`);
        });
      }, interval);
      this.reconciliationTimer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
  }

  async handleCallback(txRef: string) {
    if (!txRef) throw new BadRequestException('tx_ref is required');
    return this.verifyAndApply(txRef);
  }

  async verifyForCustomer(userId: string, txRef: string) {
    const payment = await this.findPayment(txRef);
    if (payment.order.userId !== userId) throw new ForbiddenException('Payment does not belong to this account');
    return this.verifyAndApply(txRef);
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined, alternateSignature: string | undefined) {
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    if (!webhookSecret) throw new UnauthorizedException('Chapa webhook verification is not configured');
    if (!rawBody || rawBody.length === 0) throw new BadRequestException('Webhook body is required');

    const payloadSignature = this.hmac(webhookSecret, rawBody);
    const secretSignature = this.hmac(webhookSecret, Buffer.from(webhookSecret, 'utf8'));
    const valid = this.safeEqual(signature, payloadSignature) || this.safeEqual(alternateSignature, payloadSignature) ||
      this.safeEqual(signature, secretSignature) || this.safeEqual(alternateSignature, secretSignature);
    if (!valid) throw new UnauthorizedException('Invalid Chapa webhook signature');

    let event: { tx_ref?: string; trx_ref?: string; event?: string };
    try {
      event = JSON.parse(rawBody.toString('utf8')) as typeof event;
    } catch {
      throw new BadRequestException('Webhook body must contain valid JSON');
    }
    const txRef = event.tx_ref || event.trx_ref;
    if (!txRef) throw new BadRequestException('Webhook event does not include a transaction reference');
    const result = await this.verifyAndApply(txRef);
    return { received: true, event: event.event || 'payment.update', result };
  }

  async reconcilePending(limit = 50) {
    const numericLimit = Number(limit);
    const max = Number.isFinite(numericLimit) ? Math.min(Math.max(Math.floor(numericLimit), 1), 100) : 50;
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const payments = await this.prisma.paymentRecord.findMany({
      where: { provider: 'CHAPA', status: PaymentStatus.PENDING, createdAt: { lte: cutoff } },
      orderBy: { createdAt: 'asc' },
      take: max,
      select: { transactionId: true },
    });

    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    for (const payment of payments) {
      try {
        const result = await this.verifyAndApply(payment.transactionId);
        if (result.changed) updated++;
        else unchanged++;
      } catch (error) {
        errors++;
        this.logger.warn(`Could not reconcile Chapa reference ${payment.transactionId}: ${this.errorName(error)}`);
      }
    }
    return { examined: payments.length, updated, unchanged, errors };
  }

  private async verifyAndApply(txRef: string) {
    const payment = await this.findPayment(txRef);
    if (payment.provider !== 'CHAPA') throw new NotFoundException('Chapa payment not found');
    const verification = await this.client.verifyChapa(txRef);
    this.assertMatches(payment, verification);
    const providerStatus = verification.status.toLowerCase();
    if (!['success', 'failed', 'cancelled', 'failed/cancelled'].includes(providerStatus)) {
      return { txRef, paymentStatus: payment.status, orderStatus: payment.order.status, changed: false };
    }

    const isPaid = providerStatus === 'success';
    const expectedMode = (process.env.CHAPA_EXPECTED_MODE || 'test').toLowerCase();
    if (verification.mode !== expectedMode) {
      throw new BadRequestException(`Chapa transaction mode mismatch; expected ${expectedMode}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.paymentRecord.findUnique({
        where: { transactionId: txRef },
        include: { order: { include: { orderItems: true } } },
      }) as PaymentWithOrder | null;
      if (!current || current.provider !== 'CHAPA') throw new NotFoundException('Chapa payment not found');
      if (current.status !== PaymentStatus.PENDING) {
        return { txRef, paymentStatus: current.status, orderStatus: current.order.status, changed: false };
      }
      if (current.order.status !== OrderStatus.PENDING) {
        throw new ConflictException('The order is no longer awaiting payment');
      }

      const nextPaymentStatus = isPaid ? PaymentStatus.SUCCESS : PaymentStatus.DECLINED;
      const nextOrderStatus = isPaid ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;
      const paymentUpdate = await tx.paymentRecord.updateMany({
        where: { id: current.id, status: PaymentStatus.PENDING },
        data: { status: nextPaymentStatus },
      });
      if (paymentUpdate.count !== 1) {
        return { txRef, paymentStatus: current.status, orderStatus: current.order.status, changed: false };
      }

      const orderUpdate = await tx.order.updateMany({
        where: { id: current.orderId, status: OrderStatus.PENDING },
        data: { status: nextOrderStatus },
      });
      if (orderUpdate.count !== 1) throw new ConflictException('Order state changed while settling payment');

      await tx.orderStatusHistory.create({
        data: {
          orderId: current.orderId,
          fromStatus: OrderStatus.PENDING,
          toStatus: nextOrderStatus,
          reason: isPaid ? 'Chapa payment verified' : 'Chapa payment failed',
        },
      });

      await tx.auditEvent.create({
        data: {
          action: isPaid ? 'CHAPA_PAYMENT_VERIFIED' : 'CHAPA_PAYMENT_DECLINED',
          entityName: 'PaymentRecord',
          entityId: current.id,
          oldValues: { status: PaymentStatus.PENDING },
          newValues: { status: nextPaymentStatus, orderStatus: nextOrderStatus, txRef },
        },
      });

      if (!isPaid) await this.releaseReservation(tx, current);
      return { txRef, paymentStatus: nextPaymentStatus, orderStatus: nextOrderStatus, changed: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async findPayment(txRef: string): Promise<PaymentWithOrder> {
    const payment = await this.prisma.paymentRecord.findUnique({
      where: { transactionId: txRef },
      include: { order: { include: { orderItems: true } } },
    });
    if (!payment) throw new NotFoundException('Payment reference not found');
    return payment as PaymentWithOrder;
  }

  private assertMatches(payment: PaymentWithOrder, result: ChapaVerification): void {
    if (result.txRef !== payment.transactionId || result.amountCents !== payment.amountCents || result.currency !== 'ETB') {
      throw new BadRequestException('Chapa verification did not match the expected reference, amount, or currency');
    }
  }

  private async releaseReservation(tx: Prisma.TransactionClient, payment: PaymentWithOrder): Promise<void> {
    for (const item of payment.order.orderItems) {
      const rows = await tx.$queryRaw<Array<{ quantity: number }>>`
        SELECT quantity FROM "inventory" WHERE "product_id" = ${item.productId}::uuid FOR UPDATE
      `;
      if (!rows.length) throw new NotFoundException(`Inventory missing for product ${item.productId}`);
      const balanceAfter = rows[0].quantity + item.quantity;
      await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: balanceAfter } });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantityDelta: item.quantity,
          balanceAfter,
          reason: StockMovementReason.ORDER_CANCELLATION_REFUND,
          notes: `Released stock after failed Chapa payment for ${payment.order.orderNumber}`,
        },
      });
    }
  }

  private hmac(key: string, content: Buffer): string {
    return crypto.createHmac('sha256', key).update(content).digest('hex');
  }

  private safeEqual(candidate: string | undefined, expectedHex: string): boolean {
    if (!candidate || !/^[a-f\d]{64}$/i.test(candidate)) return false;
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(expectedHex, 'hex'));
  }

  private errorName(error: unknown): string {
    return error instanceof Error ? error.name : 'UnknownError';
  }
}
