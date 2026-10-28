import { Test, TestingModule } from '@nestjs/testing';
import { PaymentClientService } from './payment-client.service';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { PaymentStatus } from '@akufada/shared';

describe('PaymentClientService (External Resilience)', () => {
  let service: PaymentClientService;
  const originalFetch = global.fetch;
  const originalChapaSecret = process.env.CHAPA_SECRET_KEY;
  const originalChapaApi = process.env.CHAPA_API_URL;

  beforeEach(async () => {
    process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST_unit_test_key_32_chars';
    process.env.CHAPA_API_URL = 'https://api.chapa.co/v1';
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentClientService],
    }).compile();

    service = module.get<PaymentClientService>(PaymentClientService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    if (originalChapaSecret === undefined) delete process.env.CHAPA_SECRET_KEY;
    else process.env.CHAPA_SECRET_KEY = originalChapaSecret;
    if (originalChapaApi === undefined) delete process.env.CHAPA_API_URL;
    else process.env.CHAPA_API_URL = originalChapaApi;
  });

  it('should process a successful charge and return provider transaction ID', async () => {
    const mockResponse = {
      transactionId: 'tx_mock_12345678',
      amountCents: 1500,
      status: PaymentStatus.SUCCESS,
      timestamp: new Date().toISOString(),
    };

    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as Response);

    const result = await service.processCharge({
      amountCents: 1500,
      idempotencyKey: 'idem_test_success',
      correlationId: 'corr_test_1',
    });

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.transactionId).toBe('tx_mock_12345678');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(callArgs[1].headers['X-Correlation-ID']).toBe('corr_test_1');
    expect(callArgs[1].headers['Idempotency-Key']).toBe('idem_test_success');
  });

  it('should throw BadRequestException when the external provider declines the card (402)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 402,
      json: jest.fn().mockResolvedValue({
        status: PaymentStatus.DECLINED,
        failureReason: 'Insufficient funds',
      }),
    } as unknown as Response);

    await expect(
      service.processCharge({
        amountCents: 2000,
        idempotencyKey: 'idem_test_decline',
        simulateOutcome: 'DECLINED',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(global.fetch).toHaveBeenCalledTimes(1); // Do not retry declines
  });

  it('should retry on transient 500 server error and succeed on second attempt', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 500,
          text: () => Promise.resolve('Temporary upstream failure'),
        } as unknown as Response);
      }
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({
            transactionId: 'tx_mock_recovered',
            amountCents: 900,
            status: PaymentStatus.SUCCESS,
            timestamp: new Date().toISOString(),
          }),
      } as unknown as Response);
    });

    const result = await service.processCharge({
      amountCents: 900,
      idempotencyKey: 'idem_test_retry',
    });

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.transactionId).toBe('tx_mock_recovered');
    expect(callCount).toBe(2);
  });

  it('should exhaust bounded retries and throw BadGatewayException when service remains 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    } as unknown as Response);

    await expect(
      service.processCharge({
        amountCents: 500,
        idempotencyKey: 'idem_test_exhaust',
      }),
    ).rejects.toThrow(BadGatewayException);

    expect(global.fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should handle timeout and throw BadGatewayException', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';

    global.fetch = jest.fn().mockRejectedValue(timeoutErr);

    await expect(
      service.processCharge({
        amountCents: 500,
        idempotencyKey: 'idem_test_timeout',
        timeoutMs: 50,
      }),
    ).rejects.toThrow(BadGatewayException);

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('initializes Chapa hosted checkout with a secret bearer token and returns only a trusted checkout URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { checkout_url: 'https://checkout.chapa.co/checkout/payment/test-ref' } }),
    } as unknown as Response);

    const result = await service.initializeChapa({
      amount: '12.34', currency: 'ETB', email: 'customer@example.test', firstName: 'Test', lastName: 'Customer',
      txRef: 'akufada_test_ref', callbackUrl: 'https://shop.example.test/api/v1/payments/chapa/callback',
      returnUrl: 'https://shop.example.test/payment/return?tx_ref=akufada_test_ref',
    });

    expect(result).toEqual({ checkoutUrl: 'https://checkout.chapa.co/checkout/payment/test-ref', txRef: 'akufada_test_ref' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.chapa.co/v1/transaction/initialize',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` }) }),
    );
  });

  it('rejects Chapa checkout URLs outside the official hosted checkout origin', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { checkout_url: 'https://attacker.example/checkout' } }),
    } as unknown as Response);

    await expect(service.initializeChapa({
      amount: '1.00', currency: 'ETB', email: 'a@example.test', firstName: 'A', lastName: 'B',
      txRef: 'ref', callbackUrl: 'https://shop.example.test/callback', returnUrl: 'https://shop.example.test/return',
    })).rejects.toThrow(BadGatewayException);
  });

  it('normalizes Chapa transaction verification data for server-side settlement checks', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { status: 'success', tx_ref: 'akufada_ref', amount: '12.34', currency: 'ETB', mode: 'test', reference: 'chapa-ref' } }),
    } as unknown as Response);

    await expect(service.verifyChapa('akufada_ref')).resolves.toEqual({
      status: 'success', txRef: 'akufada_ref', amountCents: 1234, currency: 'ETB', mode: 'test', reference: 'chapa-ref',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.chapa.co/v1/transaction/verify/akufada_ref',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
