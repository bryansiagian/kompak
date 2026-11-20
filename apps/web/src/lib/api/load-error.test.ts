import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import { classifyLoadError } from './load-error';

describe('classifyLoadError', () => {
  it.each([
    [400, 'badRequest'],
    [401, 'forbidden'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [408, 'temporary'],
    [429, 'temporary'],
    [500, 'temporary'],
    [503, 'temporary'],
    [422, 'unexpected'],
  ])('classifies HTTP %i as %s', (status, expected) => {
    expect(classifyLoadError(new ApiError(status, ''))).toBe(expected);
  });

  it('distinguishes a failed fetch from an unexpected error', () => {
    expect(classifyLoadError(new TypeError('Failed to fetch'))).toBe(
      'temporary',
    );
    expect(classifyLoadError(new SyntaxError('Invalid response'))).toBe(
      'unexpected',
    );
  });
});
