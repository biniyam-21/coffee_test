import { Injectable, Logger, BadGatewayException, BadRequestException } from '@nestjs/common';
import { PaymentStatus, MockPaymentChargeResponse } from '@akufada/shared';

export interface ChargeOptions {
  amountCents: number;
  idempotencyKey: string;
  simulateOutcome?: PaymentStatus | 'TIMEOUT' | 'ERROR' | 'SUCCESS' | 'DECLINED' | string;
  correlationId?: string;
  timeoutMs?: number;
}

export interface ChapaInitializeOptions {
  amount: string;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  txRef: string;
  callbackUrl: string;
  returnUrl: string;
}

export interface ChapaVerification {
  status: string;
  txRef: string;
  amountCents: number;
  currency: string;
  mode: string;
  reference?: string;
}

@Injectable()
export class PaymentClientService {
  private readonly logger = new Logger(PaymentClientService.name);
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries = 2;
  private readonly chapaBaseUrl = (process.env.CHAPA_API_URL || 'https://api.chapa.co/v1').trim().replace(/\/$/, '');
  private readonly chapaTimeoutMs = Number(process.env.CHAPA_TIMEOUT_MS || 10000);

  constructor() {
    this.baseUrl = process.env.MOCK_PAYMENT_URL || 'http://localhost:4000';
    this.defaultTimeoutMs = process.env.MOCK_PAYMENT_TIMEOUT_MS
      ? parseInt(process.env.MOCK_PAYMENT_TIMEOUT_MS, 10)
      : 3000;
  }

  /**
   * Executes an external charge request with timeout protection, correlation tracing,
   * non-leaking error transformation, and bounded exponential backoff retries.
   */
  async processCharge(options: ChargeOptions): Promise<MockPaymentChargeResponse> {
    const { amountCents, idempotencyKey, simulateOutcome, correlationId } = options;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const targetUrl = `${this.baseUrl}/mock-payment/v1/charges`;

    const payload = {
      amountCents,
      idempotencyKey,
      simulateOutcome:
        simulateOutcome === 'DECLINED' ? PaymentStatus.DECLINED : PaymentStatus.SUCCESS,
    };

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      attempt++;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        ...(correlationId ? { 'X-Correlation-ID': correlationId } : {}),
        ...(simulateOutcome ? { 'X-Mock-Outcome': simulateOutcome } : {}),
      };

      try {
        this.logger.log(
          `[${correlationId || 'no-corr'}] Sending charge attempt ${attempt}/${this.maxRetries + 1} to payment service (${amountCents} cents, idempotency: ${idempotencyKey})`,
        );

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.status === 200) {
          const data = (await response.json()) as MockPaymentChargeResponse;
          this.logger.log(
            `[${correlationId || 'no-corr'}] Payment successful: tx ${data.transactionId}`,
          );
          return data;
        }

        if (response.status === 402) {
          const data = (await response.json()) as MockPaymentChargeResponse;
          this.logger.warn(
            `[${correlationId || 'no-corr'}] Payment declined: ${data.failureReason || 'Insufficient funds'}`,
          );
          throw new BadRequestException('Payment transaction was declined by the payment provider');
        }

        if (response.status >= 500 && attempt <= this.maxRetries) {
          this.logger.warn(
            `[${correlationId || 'no-corr'}] Downstream 5xx (${response.status}) on attempt ${attempt}. Retrying...`,
          );
          await new Promise((r) => setTimeout(r, attempt * 150));
          continue;
        }

        throw new BadGatewayException(`Payment provider returned error status ${response.status}`);
      } catch (err: unknown) {
        if (err instanceof BadRequestException || err instanceof BadGatewayException) {
          throw err;
        }

        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
        const errName = typeof errObj.name === 'string' ? errObj.name : '';
        const errMessage = typeof errObj.message === 'string' ? errObj.message : String(err);
        const errCode = typeof errObj.code === 'string' ? errObj.code : '';
        const isTimeout = errName === 'TimeoutError' || errName === 'AbortError';
        const isNetworkErr =
          Boolean(errObj.cause) || errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND';

        this.logger.error(
          `[${correlationId || 'no-corr'}] Payment attempt ${attempt} failed: ${errMessage}`,
        );

        if ((isTimeout || isNetworkErr) && attempt <= this.maxRetries) {
          this.logger.warn(`Retrying transient payment error after backoff...`);
          await new Promise((r) => setTimeout(r, attempt * 200));
          continue;
        }

        if (isTimeout) {
          throw new BadGatewayException('Payment gateway connection timed out');
        }

        throw new BadGatewayException('Payment provider is currently unreachable');
      }
    }

    throw new BadGatewayException('Exceeded maximum payment retry attempts');
  }

  async initializeChapa(options: ChapaInitializeOptions): Promise<{ checkoutUrl: string; txRef: string }> {
    const response = await this.chapaRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: options.amount,
        currency: options.currency,
        email: options.email,
        first_name: options.firstName,
        last_name: options.lastName,
        tx_ref: options.txRef,
        callback_url: options.callbackUrl,
        return_url: options.returnUrl,
        customization: { title: 'Akufada Coffee', description: 'Coffee shop order payment' },
      }),
    });
    const checkoutUrl = response.data?.checkout_url;
    if (response.status !== 'success' || typeof checkoutUrl !== 'string') {
      throw new BadGatewayException('Chapa did not return a checkout link');
    }
    const checkout = new URL(checkoutUrl);
    if (checkout.protocol !== 'https:' || !['checkout.chapa.co', 'checkout.chapa.com'].includes(checkout.hostname)) {
      throw new BadGatewayException('Chapa returned an untrusted checkout URL');
    }
    return { checkoutUrl, txRef: options.txRef };
  }

  async verifyChapa(txRef: string): Promise<ChapaVerification> {
    const response = await this.chapaRequest(`/transaction/verify/${encodeURIComponent(txRef)}`, {
      method: 'GET',
    });
    const data = response.data;
    if (!data || typeof data !== 'object') throw new BadGatewayException('Invalid Chapa verification response');
    const verifiedRef = String(data.tx_ref || data.trx_ref || '');
    const amount = Number(data.amount);
    const amountCents = Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
    if (!verifiedRef || !Number.isSafeInteger(amountCents)) {
      throw new BadGatewayException('Chapa verification response is missing transaction details');
    }
    return {
      status: String(data.status || response.status || '').toLowerCase(),
      txRef: verifiedRef,
      amountCents,
      currency: String(data.currency || '').toUpperCase(),
      mode: String(data.mode || '').toLowerCase(),
      reference: typeof data.reference === 'string' ? data.reference : undefined,
    };
  }

  private async chapaRequest(path: string, options: RequestInit): Promise<any> {
    const secret = process.env.CHAPA_SECRET_KEY?.trim();
    if (!secret) throw new BadGatewayException('Chapa is not configured: CHAPA_SECRET_KEY is missing');
    try {
      const response = await fetch(`${this.chapaBaseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> | undefined),
        },
        signal: AbortSignal.timeout(this.chapaTimeoutMs),
      });
      const payload = (await response.json()) as { status?: string; message?: string; data?: any };
      if (!response.ok) {
        this.logger.warn(`Chapa API returned HTTP ${response.status}`);
        if (response.status === 401) {
          throw new BadGatewayException(
            'Chapa returned HTTP 401 Unauthorized. The private key is invalid, inactive, or from a different mode. Confirm CHAPA_SECRET_KEY matches the current test/live mode and recreate the backend after changing .env.',
          );
        }
        if (response.status === 403) {
          throw new BadGatewayException(
            'Chapa returned HTTP 403 Forbidden. Confirm this merchant account and key are allowed to initialize payments, or contact Chapa support.',
          );
        }
        throw new BadGatewayException('Chapa payment service rejected the request');
      }
      return payload;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      this.logger.error(`Chapa request failed (${isTimeout ? 'timeout' : 'network error'})`);
      throw new BadGatewayException(isTimeout ? 'Chapa request timed out' : 'Chapa payment service is unavailable');
    }
  }
}
