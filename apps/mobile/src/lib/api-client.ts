import { ApiErrorResponse } from '../types/api';
import { getMobileConfig } from '../config';

export class ApiClientError extends Error {
  public statusCode: number;
  public error: string;
  public correlationId?: string;

  constructor(statusCode: number, error: string, message: string, correlationId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.error = error;
    this.correlationId = correlationId;
  }
}

let currentAccessToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorizedCallback = callback;
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { idempotencyKey, params, headers, ...restOptions } = options;
  const { apiBaseUrl } = getMobileConfig();

  let url = endpoint.startsWith('http')
    ? endpoint
    : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const queryParts: string[] = [];
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    });
    if (queryParts.length > 0) {
      url += (url.includes('?') ? '&' : '?') + queryParts.join('&');
    }
  }

  const correlationId = `mob-corr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
    ...(headers as Record<string, string>),
  };

  if (currentAccessToken) {
    reqHeaders['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  if (idempotencyKey) {
    reqHeaders['Idempotency-Key'] = idempotencyKey;
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: reqHeaders,
    });

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      let errorTitle = response.statusText || 'Request Failed';
      let serverCorrelationId = response.headers.get('x-correlation-id') || correlationId;

      if (isJson) {
        try {
          const errorBody: ApiErrorResponse = await response.json();
          errorTitle = errorBody.error || errorTitle;
          serverCorrelationId = errorBody.correlationId || serverCorrelationId;

          if (Array.isArray(errorBody.message)) {
            errorMessage = errorBody.message.join(', ');
          } else if (typeof errorBody.message === 'string') {
            errorMessage = errorBody.message;
          }
        } catch {
          // ignore json parse error on failure body
        }
      }

      if (response.status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }

      throw new ApiClientError(response.status, errorTitle, errorMessage, serverCorrelationId);
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      0,
      'NetworkError',
      error instanceof Error
        ? error.message
        : 'Unable to connect to the Akufada coffee shop API server.',
    );
  }
}
