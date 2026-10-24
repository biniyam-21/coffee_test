import request from 'supertest';
import { app } from './index';
import { PaymentStatus } from '@akufada/shared';

describe('Mock Payment Service Endpoints', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('mock-payment-service');
  });

  it('POST /mock-payment/v1/charges should process successful charge by default', async () => {
    const res = await request(app)
      .post('/mock-payment/v1/charges')
      .send({
        amountCents: 450,
        idempotencyKey: 'test_key_123',
      })
      .expect(200);

    expect(res.body.status).toBe(PaymentStatus.SUCCESS);
    expect(res.body.amountCents).toBe(450);
    expect(res.body.transactionId).toMatch(/^tx_mock_/);
  });

  it('POST /mock-payment/v1/charges should simulate DECLINED outcome when requested', async () => {
    const res = await request(app)
      .post('/mock-payment/v1/charges')
      .set('x-mock-outcome', 'DECLINED')
      .send({
        amountCents: 450,
        idempotencyKey: 'test_key_decline',
      })
      .expect(402);

    expect(res.body.status).toBe(PaymentStatus.DECLINED);
    expect(res.body.failureReason).toBeDefined();
  });

  it('POST /mock-payment/v1/charges should simulate 500 internal outage when ERROR outcome is requested', async () => {
    const res = await request(app)
      .post('/mock-payment/v1/charges')
      .set('x-mock-outcome', 'ERROR')
      .send({
        amountCents: 1200,
        idempotencyKey: 'test_key_error',
      })
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
    expect(res.body.message).toContain('infrastructure outage');
  });

  it('POST /mock-payment/v1/charges should simulate custom HTTP 503 Service Unavailable', async () => {
    const res = await request(app)
      .post('/mock-payment/v1/charges')
      .set('x-mock-status-code', '503')
      .send({
        amountCents: 850,
        idempotencyKey: 'test_key_503',
      })
      .expect(503);

    expect(res.body.error).toBe('Server Error');
    expect(res.body.message).toContain('HTTP 503');
  });

  it('POST /mock-payment/v1/charges should handle artificial latency delay', async () => {
    const startTime = Date.now();
    const res = await request(app)
      .post('/mock-payment/v1/charges')
      .set('x-mock-delay-ms', '60')
      .send({
        amountCents: 500,
        idempotencyKey: 'test_key_delay',
      })
      .expect(200);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(res.body.status).toBe(PaymentStatus.SUCCESS);
  });
});
