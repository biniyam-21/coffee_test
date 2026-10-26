import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiClientError, setAccessToken, setOnUnauthorized } from './api-client';

describe('API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('injects content-type, correlation-id, and authorization token', async () => {
    setAccessToken('test-jwt-token-xyz');

    const mockResponse = { data: 'ok' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await apiRequest<{ data: string }>('/test-endpoint');

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0] as string;
    const options = callArgs[1] as RequestInit;

    expect(url).toContain('/test-endpoint');
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer test-jwt-token-xyz');
    expect(headers['X-Correlation-ID']).toBeTruthy();
  });

  it('injects Idempotency-Key when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'created' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await apiRequest('/orders', {
      idempotencyKey: 'idem-uuid-12345',
    });

    const options = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('idem-uuid-12345');
  });

  it('parses structured API errors and triggers onUnauthorized callback for 401', async () => {
    const unauthorizedCallback = vi.fn();
    setOnUnauthorized(unauthorizedCallback);

    const errorBody = {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Access token expired or invalid',
      correlationId: 'corr-401',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({
        'content-type': 'application/json',
        'x-correlation-id': 'corr-401',
      }),
      json: async () => errorBody,
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(apiRequest('/protected-endpoint')).rejects.toThrow(ApiClientError);
    expect(unauthorizedCallback).toHaveBeenCalledTimes(1);
  });
});
