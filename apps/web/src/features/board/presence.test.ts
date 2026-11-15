import { describe, expect, it } from 'vitest';
import {
  colorIndexOf,
  initialsOf,
  othersOf,
  visibleAvatars,
} from './presence';

const user = (userId: string, name = userId) => ({ userId, name });

describe('initialsOf', () => {
  it('memakai huruf pertama kata pertama dan terakhir, huruf besar', () => {
    expect(initialsOf('Bryan Torisi Siagian')).toBe('BS');
    expect(initialsOf('bryan')).toBe('B');
    expect(initialsOf('  ani   lestari ')).toBe('AL');
  });

  it('nama kosong menghasilkan tanda tanya', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('colorIndexOf', () => {
  it('selalu sama untuk ID yang sama dan berada dalam rentang', () => {
    expect(colorIndexOf('user-1', 6)).toBe(colorIndexOf('user-1', 6));
    for (const id of ['a', 'b', 'user-1', '922944be-d2dc-4c77-a9a8']) {
      const index = colorIndexOf(id, 6);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(6);
    }
  });
});

describe('othersOf dan visibleAvatars', () => {
  it('mengecualikan diri sendiri', () => {
    expect(othersOf([user('me'), user('a'), user('b')], 'me')).toEqual([
      user('a'),
      user('b'),
    ]);
  });

  it('menampilkan sebagian dan menghitung sisanya', () => {
    const users = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => user(id));
    const { shown, hidden } = visibleAvatars(users, 4);
    expect(shown.map((item) => item.userId)).toEqual(['a', 'b', 'c', 'd']);
    expect(hidden).toBe(2);
    expect(visibleAvatars(users.slice(0, 2), 4)).toEqual({
      shown: users.slice(0, 2),
      hidden: 0,
    });
  });
});