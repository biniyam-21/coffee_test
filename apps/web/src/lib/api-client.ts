import { ApiErrorResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { idempotencyKey, params, headers, ...restOptions } = options;

  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': crypto.randomUUID ? crypto.randomUUID() : `corr-${Date.now()}`,
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
      let errorTitle = response.statusText;
      let correlationId = response.headers.get('x-correlation-id') || undefined;

      if (isJson) {
        try {
          const errorBody: ApiErrorResponse = await response.json();
          errorTitle = errorBody.error || errorTitle;
          correlationId = errorBody.correlationId || correlationId;

          if (Array.isArray(errorBody.message)) {
            errorMessage = errorBody.message.join(', ');
          } else if (typeof errorBody.message === 'string') {
            errorMessage = errorBody.message;
          }
        } catch {
          // ignore json parse failure for error
        }
      }

      if (response.status === 401 && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }

      throw new ApiClientError(response.status, errorTitle, errorMessage, correlationId);
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    // Preserve intentional abort signals so callers and effects can cleanly ignore them
    if (
      (error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted'))) ||
      (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
    ) {
      throw error;
    }
    throw new ApiClientError(
      0,
      'NetworkError',
      error instanceof Error ? error.message : 'Unable to connect to the coffee shop backend API',
    );
  }
}
