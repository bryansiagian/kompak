import { describe, expect, it } from 'vitest';
import type { Comment } from '@kompak/shared';
import {
  applyCommentEvent,
  commentEventCardId,
  isEdited,
  removeComment,
  upsertComment,
} from './comments-cache';

function comment(id: string, createdAt: string, overrides: Partial<Comment> = {}): Comment {
  return {
    id,
    cardId: 'c1',
    authorId: 'u1',
    authorName: 'Ani',
    body: `isi ${id}`,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

const T1 = '2026-11-20T10:00:00.000Z';
const T2 = '2026-11-20T10:01:00.000Z';
const T3 = '2026-11-20T10:02:00.000Z';

describe('upsertComment', () => {
  it('menyisipkan komentar baru sesuai urutan waktu', () => {
    const list = [comment('a', T1), comment('c', T3)];
    const next = upsertComment(list, comment('b', T2));
    expect(next.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(list.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('mengganti komentar yang lebih baru versinya', () => {
    const list = [comment('a', T1)];
    const next = upsertComment(list, comment('a', T1, { body: 'baru', updatedAt: T2 }));
    expect(next[0].body).toBe('baru');
  });

  it('mengabaikan versi yang sama atau lebih lama dan mengembalikan daftar yang sama', () => {
    const list = [comment('a', T1, { body: 'baru', updatedAt: T2 })];
    expect(upsertComment(list, comment('a', T1))).toBe(list);
    expect(upsertComment(list, comment('a', T1, { body: 'baru', updatedAt: T2 }))).toBe(list);
  });
});

describe('removeComment', () => {
  it('menghapus; komentar yang sudah tidak ada mengembalikan daftar yang sama', () => {
    const list = [comment('a', T1), comment('b', T2)];
    expect(removeComment(list, 'a').map((item) => item.id)).toEqual(['b']);
    expect(removeComment(list, 'x')).toBe(list);
  });
});

describe('applyCommentEvent', () => {
  const list = [comment('a', T1)];

  it('created dan updated memakai upsert, deleted menghapus', () => {
    const created = applyCommentEvent(list, {
      type: 'comment.created',
      boardId: 'b1',
      comment: comment('b', T2),
    });
    expect(created.map((item) => item.id)).toEqual(['a', 'b']);

    const updated = applyCommentEvent(list, {
      type: 'comment.updated',
      boardId: 'b1',
      comment: comment('a', T1, { body: 'baru', updatedAt: T3 }),
    });
    expect(updated[0].body).toBe('baru');

    const deleted = applyCommentEvent(list, {
      type: 'comment.deleted',
      boardId: 'b1',
      commentId: 'a',
      cardId: 'c1',
    });
    expect(deleted).toEqual([]);
  });

  it('mengambil ID tugas dari ketiga jenis peristiwa', () => {
    expect(
      commentEventCardId({
        type: 'comment.created',
        boardId: 'b1',
        comment: comment('a', T1, { cardId: 'k9' }),
      }),
    ).toBe('k9');
    expect(
      commentEventCardId({
        type: 'comment.deleted',
        boardId: 'b1',
        commentId: 'a',
        cardId: 'k7',
      }),
    ).toBe('k7');
  });
});

describe('isEdited', () => {
  it('selisih beberapa milidetik bukan perubahan', () => {
    expect(isEdited(comment('a', T1, { updatedAt: '2026-11-20T10:00:00.040Z' }))).toBe(false);
    expect(isEdited(comment('a', T1))).toBe(false);
  });

  it('selisih bermakna dianggap diubah', () => {
    expect(isEdited(comment('a', T1, { updatedAt: T2 }))).toBe(true);
  });
});