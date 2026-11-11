import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { workspaceErrorKey } from './errors';

describe('workspaceErrorKey', () => {
  it('memetakan status API ke kunci pesan', () => {
    expect(workspaceErrorKey(new ApiError(404, 'x'))).toBe('notFound');
    expect(workspaceErrorKey(new ApiError(403, 'x'))).toBe('forbidden');
    expect(workspaceErrorKey(new ApiError(429, 'x'))).toBe('tooManyRequests');
    expect(workspaceErrorKey(new ApiError(500, 'x'))).toBe('generic');
  });

  it('mengenali galat jaringan dan galat lain', () => {
    expect(workspaceErrorKey(new TypeError('Failed to fetch'))).toBe('network');
    expect(workspaceErrorKey(new Error('apa saja'))).toBe('generic');
  });
});