import express, { Request, Response } from 'express';
import {
  PaymentStatus,
  MockPaymentChargeRequest,
  MockPaymentChargeResponse,
} from '@akufada/shared';
import { randomUUID } from 'crypto';

export const app = express();
app.use(express.json());

// Liveness probe
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'mock-payment-service',
    timestamp: new Date().toISOString(),
  });
});

// Mock charge processing endpoint with chaos & resilience simulation
app.post('/mock-payment/v1/charges', async (req: Request, res: Response) => {
  const body = req.body as MockPaymentChargeRequest & { delayMs?: number };

  if (!body || typeof body.amountCents !== 'number' || !body.idempotencyKey) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'amountCents and idempotencyKey are required',
    });
  }

  // Artificial delay simulation for timeout testing
  const delayHeader = req.headers['x-mock-delay-ms'] as string | undefined;
  const delayMs = delayHeader ? parseInt(delayHeader, 10) : body.delayMs || 0;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 10000)));
  }

  // Explicit status code override
  const statusCodeHeader = req.headers['x-mock-status-code'] as string | undefined;
  if (statusCodeHeader) {
    const code = parseInt(statusCodeHeader, 10);
    if (!isNaN(code) && code >= 400) {
      return res.status(code).json({
        error: code >= 500 ? 'Server Error' : 'Client Error',
        message: `Simulated HTTP ${code} from mock payment provider`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Outcome simulation flag (body or header)
  const outcomeHeader = req.headers['x-mock-outcome'] as string | undefined;
  const rawOutcome = outcomeHeader || body.simulateOutcome || 'SUCCESS';

  if (rawOutcome === 'ERROR') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Simulated payment provider infrastructure outage',
      timestamp: new Date().toISOString(),
    });
  }

  if (rawOutcome === 'TIMEOUT') {
    // Artificial timeout: wait 4000ms
    await new Promise((resolve) => setTimeout(resolve, 4000));
    return res.status(504).json({
      error: 'Gateway Timeout',
      message: 'Simulated downstream payment gateway response timeout',
      timestamp: new Date().toISOString(),
    });
  }

  const outcome: PaymentStatus =
    rawOutcome === 'DECLINED' ? PaymentStatus.DECLINED : PaymentStatus.SUCCESS;

  const responsePayload: MockPaymentChargeResponse = {
    transactionId: `tx_mock_${randomUUID().substring(0, 8)}`,
    amountCents: body.amountCents,
    status: outcome,
    timestamp: new Date().toISOString(),
    ...(outcome === PaymentStatus.DECLINED
      ? { failureReason: 'Simulated insufficient funds' }
      : {}),
  };

  if (outcome === PaymentStatus.DECLINED) {
    return res.status(402).json(responsePayload);
  }

  return res.status(200).json(responsePayload);
});

const port = process.env.MOCK_PAYMENT_PORT ? parseInt(process.env.MOCK_PAYMENT_PORT, 10) : 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Mock Payment Service listening on port ${port}`);
  });
}
