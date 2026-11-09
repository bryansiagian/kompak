import type { CookieOptions, Request, Response } from 'express';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';

function baseOptions(): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    // Browser tidak konsisten menerima Domain=localhost, jadi dilewati.
    domain: domain && domain !== 'localhost' ? domain : undefined,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, unknown> })
    .cookies;
  const value = cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' ? value : undefined;
}