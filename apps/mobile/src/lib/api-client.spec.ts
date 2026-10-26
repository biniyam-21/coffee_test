import { apiRequest, ApiClientError, setAccessToken, setOnUnauthorized } from './api-client';

describe('Mobile Centralized API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('injects Content-Type, correlation ID, and active Bearer token into headers', async () => {
    setAccessToken('mobile-jwt-access-token');

    const mockResponse = { data: 'pong' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await apiRequest<{ data: string }>('/ping');

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0] as string;
    const options = callArgs[1] as RequestInit;

    expect(url).toContain('/ping');
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer mobile-jwt-access-token');
    expect(headers['X-Correlation-ID']).toMatch(/^mob-corr-/);
  });

  it('injects Idempotency-Key and query parameters correctly', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'order-123' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await apiRequest('/orders', {
      idempotencyKey: 'mob-idem-uuid-999',
      params: { category: 'hot-coffee', limit: 10 },
    });

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0] as string;
    const options = callArgs[1] as RequestInit;

    expect(url).toContain('category=hot-coffee');
    expect(url).toContain('limit=10');
    const headers = options.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('mob-idem-uuid-999');
  });

  it('unpacks RFC 7807 error responses and triggers onUnauthorized for 401 status', async () => {
    const unauthorizedSpy = jest.fn();
    setOnUnauthorized(unauthorizedSpy);

    const errorPayload = {
      statusCode: 401,
      error: 'Unauthorized',
      message: ['Your mobile session has expired', 'Please log in again'],
      correlationId: 'server-corr-789',
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({
        'content-type': 'application/json',
        'x-correlation-id': 'server-corr-789',
      }),
      json: async () => errorPayload,
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(apiRequest('/protected-resource')).rejects.toThrow(ApiClientError);
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
  });

  it('wraps fetch network connection failures in ApiClientError with code 0', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(apiRequest('/unreachable')).rejects.toMatchObject({
      statusCode: 0,
      error: 'NetworkError',
      message: 'Network request failed',
    });
  });
});
