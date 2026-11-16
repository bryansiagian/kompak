import { describe, expect, it } from 'vitest';
import { canDeleteComment, canEditComment } from './comment-permissions';

const owner = { userId: 'o', role: 'OWNER' as const };
const admin = { userId: 'a', role: 'ADMIN' as const };
const member = { userId: 'm', role: 'MEMBER' as const };

describe('comment permissions', () => {
  it('hanya penulis yang bisa mengedit, termasuk terhadap Ketua dan Pengelola', () => {
    expect(canEditComment(member, { authorId: 'm' })).toBe(true);
    expect(canEditComment(owner, { authorId: 'm' })).toBe(false);
    expect(canEditComment(admin, { authorId: 'm' })).toBe(false);
  });

  it('penulis, Pengelola, atau Ketua bisa menghapus; Anggota lain tidak', () => {
    expect(canDeleteComment(member, { authorId: 'm' })).toBe(true);
    expect(canDeleteComment(admin, { authorId: 'm' })).toBe(true);
    expect(canDeleteComment(owner, { authorId: 'm' })).toBe(true);
    expect(canDeleteComment(member, { authorId: 'x' })).toBe(false);
  });
});