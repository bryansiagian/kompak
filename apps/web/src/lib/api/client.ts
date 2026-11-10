import { authResponseSchema } from '@kompak/shared';
import type { AuthResponse } from '@kompak/shared';
import { ApiError } from './api-error';
import { getAccessToken, setAccessToken } from './token-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_PREFIX = '/api/v1';

export interface Parser<T> {
  parse(data: unknown): T;
}

interface SendOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

interface RequestOptions<T> extends SendOptions {
  schema: Parser<T>;
  // Dimatikan untuk login/register: 401 di sana berarti kredensial salah.
  refreshOn401?: boolean;
}

function send(path: string, options: SendOptions): Promise<Response> {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${API_URL}${API_PREFIX}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
  });
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText;
  let code: string | undefined;
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null) {
      if ('message' in body && typeof body.message === 'string') {
        message = body.message;
      }
      if ('code' in body && typeof body.code === 'string') {
        code = body.code;
      }
    }
  } catch {
    // Body kosong atau bukan JSON: pakai statusText.
  }
  return new ApiError(response.status, message, code);
}

async function doRefresh(): Promise<AuthResponse | null> {
  const response = await fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (response.status === 401) {
    setAccessToken(null);
    return null;
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  const session = authResponseSchema.parse(await response.json());
  setAccessToken(session.accessToken);
  return session;
}

let refreshing: Promise<AuthResponse | null> | null = null;

// Refresh token berotasi: dua refresh bersamaan akan saling membatalkan,
// jadi semua pemanggil berbagi satu permintaan.
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions<T>,
): Promise<T> {
  const { refreshOn401 = true } = options;
  const sentToken = getAccessToken();
  let response = await send(path, options);

  if (response.status === 401 && refreshOn401) {
    const current = getAccessToken();
    // Token sudah diganti permintaan lain: cukup ulangi tanpa refresh lagi.
    const recovered =
      (current !== null && current !== sentToken) ||
      (await refreshSession()) !== null;
    if (recovered) {
      response = await send(path, options);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  return options.schema.parse(await response.json());
}

// POST yang dijawab 204 (tanpa isi), misalnya logout atau permintaan kode email.
export async function apiPostNoContent(
  path: string,
  body?: unknown,
): Promise<void> {
  const response = await send(path, { method: 'POST', body });
  if (!response.ok) {
    throw await toApiError(response);
  }
}