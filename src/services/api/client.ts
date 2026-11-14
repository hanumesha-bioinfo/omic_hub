import { API_BASE_URL, JSON_CONTENT_TYPE } from './config';
import { ApiError } from './errors';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  parseAs?: 'json' | 'text' | 'none';
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

function buildRequestBody(body: unknown): { body?: BodyInit; contentType?: string } {
  if (body === undefined) {
    return {};
  }
  if (isBodyInit(body)) {
    return { body };
  }
  return { body: JSON.stringify(body), contentType: JSON_CONTENT_TYPE };
}

async function parseResponse<T>(response: Response, parseAs: 'json' | 'text' | 'none'): Promise<T> {
  if (parseAs === 'none' || response.status === 204) {
    return undefined as T;
  }
  if (parseAs === 'text') {
    return (await response.text()) as unknown as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, parseAs = 'json', ...rest } = options;
  const requestBody = buildRequestBody(body);
  const requestHeaders = new Headers(headers);
  if (requestBody.contentType && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', requestBody.contentType);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: requestBody.body,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Server returned ${response.status}`, path, response.statusText);
  }

  return parseResponse<T>(response, parseAs);
}

export function getJson<T>(path: string, options: Omit<RequestOptions, 'body' | 'parseAs'> = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' });
}

export function postJson<T>(
  path: string,
  body: unknown,
  errorMessage: (status: number) => string = (status) => `Server returned ${status}`
): Promise<T> {
  return request<T>(path, { method: 'POST', body }).catch((error: unknown) => {
    if (error instanceof ApiError) {
      throw new ApiError(error.status, errorMessage(error.status), path, error.statusText);
    }
    throw error;
  });
}

export function postJsonOrNull<T>(path: string, body: unknown): Promise<T | null> {
  return request<T>(path, { method: 'POST', body }).catch((error: unknown) => {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  });
}
