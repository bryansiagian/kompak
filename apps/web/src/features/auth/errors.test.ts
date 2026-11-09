import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { authErrorKey } from './errors';

describe('authErrorKey', () => {
  it('memetakan status API ke kunci pesan', () => {
    expect(authErrorKey(new ApiError(409, 'x'))).toBe('emailTaken');
    expect(authErrorKey(new ApiError(401, 'x'))).toBe('invalidCredentials');
    expect(authErrorKey(new ApiError(429, 'x'))).toBe('tooManyRequests');
    expect(authErrorKey(new ApiError(500, 'x'))).toBe('generic');
  });

  it('mengenali galat jaringan', () => {
    expect(authErrorKey(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('memakai pesan umum untuk galat lain', () => {
    expect(authErrorKey(new Error('apa saja'))).toBe('generic');
  });
});