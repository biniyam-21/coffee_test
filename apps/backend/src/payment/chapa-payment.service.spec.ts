import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { OrderStatus, PaymentStatus } from '@akufada/shared';
import { ChapaPaymentService } from './chapa-payment.service';

describe('ChapaPaymentService', () => {
  let service: ChapaPaymentService;
  let prisma: any;
  let client: any;
  let tx: any;
  const originalSecret = process.env.CHAPA_WEBHOOK_SECRET;
  const originalMode = process.env.CHAPA_EXPECTED_MODE;

  beforeEach(() => {
    process.env.CHAPA_WEBHOOK_SECRET = 'webhook-secret-for-unit-tests';
    process.env.CHAPA_EXPECTED_MODE = 'test';
    const payment = {
      id: 'payment-1', orderId: 'order-1', transactionId: 'akufada_ref', provider: 'CHAPA',
      amountCents: 1234, status: PaymentStatus.PENDING,
      order: { id: 'order-1', userId: 'user-1', orderNumber: 'ORD-1', status: OrderStatus.PENDING, orderItems: [] },
    };
    tx = {
      paymentRecord: {
        findUnique: jest.fn().mockResolvedValue(payment),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn().mockResolvedValue([{ quantity: 3 }]),
      inventory: { update: jest.fn().mockResolvedValue({}) },
      stockMovement: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      paymentRecord: { findUnique: jest.fn().mockResolvedValue(payment), findMany: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    client = {
      verifyChapa: jest.fn().mockResolvedValue({
        status: 'success', txRef: 'akufada_ref', amountCents: 1234, currency: 'ETB', mode: 'test',
      }),
    };
    service = new ChapaPaymentService(prisma, client);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CHAPA_WEBHOOK_SECRET;
    else process.env.CHAPA_WEBHOOK_SECRET = originalSecret;
    if (originalMode === undefined) delete process.env.CHAPA_EXPECTED_MODE;
    else process.env.CHAPA_EXPECTED_MODE = originalMode;
  });

  it('verifies callback data with Chapa and transitions pending payment/order only once', async () => {
    await expect(service.handleCallback('akufada_ref')).resolves.toMatchObject({
      paymentStatus: PaymentStatus.SUCCESS,
      orderStatus: OrderStatus.CONFIRMED,
      changed: true,
    });
    expect(client.verifyChapa).toHaveBeenCalledWith('akufada_ref');
    expect(tx.paymentRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'payment-1', status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.SUCCESS },
    }));
    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order-1', status: OrderStatus.PENDING },
      data: { status: OrderStatus.CONFIRMED },
    }));
  });

  it('rejects invalid webhook signatures before looking up or changing payments', async () => {
    const body = Buffer.from(JSON.stringify({ tx_ref: 'akufada_ref', event: 'charge.success' }));
    await expect(service.handleWebhook(body, '0'.repeat(64), undefined)).rejects.toThrow(UnauthorizedException);
    expect(client.verifyChapa).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accepts a valid raw-body signature and verifies the payment through Chapa', async () => {
    const body = Buffer.from(JSON.stringify({ tx_ref: 'akufada_ref', event: 'charge.success' }));
    const signature = crypto.createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET!).update(body).digest('hex');
    await expect(service.handleWebhook(body, undefined, signature)).resolves.toMatchObject({
      received: true,
      result: { paymentStatus: PaymentStatus.SUCCESS, orderStatus: OrderStatus.CONFIRMED },
    });
  });

  it('rejects amount or currency mismatches even when Chapa reports success', async () => {
    client.verifyChapa.mockResolvedValue({ status: 'success', txRef: 'akufada_ref', amountCents: 999, currency: 'ETB', mode: 'test' });
    await expect(service.handleCallback('akufada_ref')).rejects.toThrow('reference, amount, or currency');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancels a failed Chapa order and releases its reserved stock exactly once', async () => {
    const paymentWithItem = {
      id: 'payment-1', orderId: 'order-1', transactionId: 'akufada_ref', provider: 'CHAPA',
      amountCents: 1234, status: PaymentStatus.PENDING,
      order: {
        id: 'order-1', userId: 'user-1', orderNumber: 'ORD-1', status: OrderStatus.PENDING,
        orderItems: [{ productId: 'product-1', quantity: 2 }],
      },
    };
    prisma.paymentRecord.findUnique.mockResolvedValue(paymentWithItem);
    tx.paymentRecord.findUnique.mockResolvedValue(paymentWithItem);
    client.verifyChapa.mockResolvedValue({
      status: 'failed', txRef: 'akufada_ref', amountCents: 1234, currency: 'ETB', mode: 'test',
    });

    await expect(service.handleCallback('akufada_ref')).resolves.toMatchObject({
      paymentStatus: PaymentStatus.DECLINED,
      orderStatus: OrderStatus.CANCELLED,
      changed: true,
    });
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' }, data: { quantity: 5 },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantityDelta: 2, balanceAfter: 5 }),
    }));
  });
});
