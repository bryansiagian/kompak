import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { getAccessToken, setAccessToken } from './token-store';

vi.mock('@kompak/shared', () => ({
  authResponseSchema: { parse: (data: unknown) => data },
}));

const user = { id: 'u1', email: 'a@example.com', name: 'A' };
const meParser = { parse: (data: unknown) => data as typeof user };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function bearerOf(init?: RequestInit): string | null {
  return new Headers(init?.headers).get('Authorization');
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('apiRequest', () => {
  it('mengirim access token dan cookie (credentials include)', async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        json(200, user),
    );
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('abc');

    await apiRequest('/auth/me', { schema: meParser });

    const init = fetchMock.mock.calls[0][1];
    expect(bearerOf(init)).toBe('Bearer abc');
    expect(init?.credentials).toBe('include');
  });

  it('saat 401 melakukan refresh sekali lalu mengulang, walau ada dua permintaan bersamaan', async () => {
    let refreshCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).endsWith('/auth/refresh')) {
          refreshCalls += 1;
          return json(200, { accessToken: 'fresh', user });
        }
        return bearerOf(init) === 'Bearer fresh'
          ? json(200, user)
          : json(401, { message: 'Invalid or expired access token' });
      }),
    );
    setAccessToken('stale');

    const [first, second] = await Promise.all([
      apiRequest('/auth/me', { schema: meParser }),
      apiRequest('/auth/me', { schema: meParser }),
    ]);

    expect(first.email).toBe(user.email);
    expect(second.email).toBe(user.email);
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe('fresh');
  });

  it('jika refresh ditolak, melempar ApiError 401 dan mengosongkan token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(401, { message: 'Invalid refresh token' })),
    );
    setAccessToken('stale');

    await expect(
      apiRequest('/auth/me', { schema: meParser }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 401 });
    expect(getAccessToken()).toBeNull();
  });

  it('tidak mencoba refresh bila refreshOn401 dimatikan', async () => {
    const fetchMock = vi.fn(async () =>
      json(401, { message: 'Invalid email or password' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest('/auth/login', {
        method: 'POST',
        body: {},
        schema: meParser,
        refreshOn401: false,
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});