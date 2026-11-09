import { getStoredToken } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

/** JSON request to the Laravel API. Errors carry the (already translated) server message. */
export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = options.auth === false ? null : getStoredToken();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errors = (data && typeof data.errors === 'object' ? data.errors : {}) as Record<string, string[]>;
    const firstError = Object.values(errors)[0]?.[0];
    throw new ApiError(firstError || (typeof data?.message === 'string' ? data.message : `HTTP ${response.status}`), response.status, errors);
  }

  return data as T;
}

/** Downloads a binary API response (PDF, Excel, CSV) and saves it in the browser. */
export async function apiDownload(path: string, fallbackName: string): Promise<void> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(typeof data?.message === 'string' ? data.message : `HTTP ${response.status}`, response.status);
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
