import { describe, expect, it } from 'vitest';
import { isSafeNextPath } from './next-path';

describe('isSafeNextPath', () => {
  it('menerima jalur internal', () => {
    expect(isSafeNextPath('/')).toBe(true);
    expect(isSafeNextPath('/join/ABCD2345')).toBe(true);
  });

  it('menolak jalur yang bisa membawa ke situs lain', () => {
    expect(isSafeNextPath('//evil.example')).toBe(false);
    expect(isSafeNextPath('https://evil.example')).toBe(false);
    expect(isSafeNextPath('/\\evil.example')).toBe(false);
  });

  it('menolak nilai kosong', () => {
    expect(isSafeNextPath(null)).toBe(false);
    expect(isSafeNextPath(undefined)).toBe(false);
    expect(isSafeNextPath('')).toBe(false);
  });
});