import { describe, expect, it } from 'vitest';
import type { BoardDetail, BoardEvent, Card } from '@kompak/shared';
import { listCardIds } from './board-cache';
import { applyBoardEvent } from './board-events';
import { makeBoard, makeCard } from './test-fixtures';

const NEWER = '2026-01-02T00:00:00.000Z';
const OLDER = '2025-12-31T00:00:00.000Z';

function cardAt(id: string, listId: string, updatedAt: string): Card {
  return { ...makeCard(id, listId), updatedAt };
}

function apply(board: BoardDetail, event: BoardEvent): BoardDetail | null {
  return applyBoardEvent(board, event);
}

const listOf = (id: string, name = id) => ({
  id,
  boardId: 'b1',
  name,
  position: 0,
});

describe('board dan presence', () => {
  it('board.updated mengganti nama; nama yang sama mengembalikan papan yang sama', () => {
    const board = makeBoard();
    const renamed = apply(board, {
      type: 'board.updated',
      boardId: 'b1',
      board: { id: 'b1', workspaceId: 'w1', name: 'Baru', createdAt: '' },
    });
    expect(renamed?.name).toBe('Baru');
    expect(
      apply(board, {
        type: 'board.updated',
        boardId: 'b1',
        board: { id: 'b1', workspaceId: 'w1', name: board.name, createdAt: '' },
      }),
    ).toBe(board);
  });

  it('presence.updated dan board.deleted tidak mengubah cache', () => {
    const board = makeBoard();
    expect(
      apply(board, { type: 'presence.updated', boardId: 'b1', users: [] }),
    ).toBe(board);
    expect(apply(board, { type: 'board.deleted', boardId: 'b1' })).toBe(board);
  });

    it('peristiwa komentar dan riwayat tidak mengubah cache papan', () => {
    const board = makeBoard();
    const comment = {
      id: 'k1',
      cardId: 'a',
      authorId: 'u1',
      authorName: 'Ani',
      body: 'Halo',
      createdAt: NEWER,
      updatedAt: NEWER,
    };
    expect(
      apply(board, { type: 'comment.created', boardId: 'b1', comment }),
    ).toBe(board);
    expect(
      apply(board, { type: 'comment.updated', boardId: 'b1', comment }),
    ).toBe(board);
    expect(
      apply(board, {
        type: 'comment.deleted',
        boardId: 'b1',
        commentId: 'k1',
        cardId: 'a',
      }),
    ).toBe(board);
    expect(
      apply(board, {
        type: 'activity.created',
        boardId: 'b1',
        activity: {
          id: 'r1',
          boardId: 'b1',
          cardId: 'a',
          actorId: 'u1',
          actorName: 'Ani',
          createdAt: NEWER,
          type: 'card.deleted',
          payload: { title: 'A' },
        },
      }),
    ).toBe(board);
  });
});

describe('kolom', () => {
  it('list.created menambah di akhir; duplikat diabaikan', () => {
    const board = makeBoard();
    const added = apply(board, {
      type: 'list.created',
      boardId: 'b1',
      list: listOf('review'),
    });
    expect(added?.lists.map((list) => list.id)).toEqual([
      'todo',
      'doing',
      'done',
      'review',
    ]);
    expect(
      apply(board, { type: 'list.created', boardId: 'b1', list: listOf('todo') }),
    ).toBe(board);
  });

  it('list.updated mengganti nama; kolom tidak dikenal memicu pengambilan ulang', () => {
    const board = makeBoard();
    const renamed = apply(board, {
      type: 'list.updated',
      boardId: 'b1',
      list: listOf('todo', 'Baru'),
    });
    expect(renamed?.lists[0].name).toBe('Baru');
    expect(
      apply(board, { type: 'list.updated', boardId: 'b1', list: listOf('x') }),
    ).toBeNull();
  });

  it('list.moved mengurutkan sesuai order; order dengan ID asing memicu pengambilan ulang', () => {
    const board = makeBoard();
    const moved = apply(board, {
      type: 'list.moved',
      boardId: 'b1',
      list: listOf('done'),
      order: ['done', 'todo', 'doing'],
    });
    expect(moved?.lists.map((list) => list.id)).toEqual(['done', 'todo', 'doing']);

    expect(
      apply(board, {
        type: 'list.moved',
        boardId: 'b1',
        list: listOf('done'),
        order: ['done', 'todo', 'tidak-dikenal'],
      }),
    ).toBeNull();
    expect(
      apply(board, {
        type: 'list.moved',
        boardId: 'b1',
        list: listOf('x'),
        order: ['x'],
      }),
    ).toBeNull();
  });

  it('list.deleted menghapus; kolom yang sudah tidak ada diabaikan', () => {
    const board = makeBoard();
    const removed = apply(board, {
      type: 'list.deleted',
      boardId: 'b1',
      listId: 'todo',
    });
    expect(removed?.lists.map((list) => list.id)).toEqual(['doing', 'done']);
    expect(
      apply(board, { type: 'list.deleted', boardId: 'b1', listId: 'x' }),
    ).toBe(board);
  });
});

describe('tugas', () => {
  it('card.created menambah di akhir kolom; duplikat diabaikan; kolom asing memicu pengambilan ulang', () => {
    const board = makeBoard();
    const added = apply(board, {
      type: 'card.created',
      boardId: 'b1',
      card: cardAt('e', 'doing', NEWER),
    });
    expect(added && listCardIds(added, 'doing')).toEqual(['d', 'e']);

    expect(
      apply(board, {
        type: 'card.created',
        boardId: 'b1',
        card: cardAt('a', 'todo', NEWER),
      }),
    ).toBe(board);
    expect(
      apply(board, {
        type: 'card.created',
        boardId: 'b1',
        card: cardAt('z', 'tidak-ada', NEWER),
      }),
    ).toBeNull();
  });

  it('card.updated hanya mengganti isi tugas, tanpa memindahkan kolom atau urutan', () => {
    const board = makeBoard();
    const updated = apply(board, {
      type: 'card.updated',
      boardId: 'b1',
      card: {
        ...cardAt('b', 'doing', NEWER),
        title: 'Judul Baru',
        description: 'Isi',
        assigneeId: 'u2',
        dueDate: '2026-12-31',
      },
    });
    expect(updated && listCardIds(updated, 'todo')).toEqual(['a', 'b', 'c']);
    expect(updated?.lists[0].cards[1]).toMatchObject({
      title: 'Judul Baru',
      description: 'Isi',
      assigneeId: 'u2',
      dueDate: '2026-12-31',
      listId: 'todo',
      updatedAt: NEWER,
    });
  });

  it('card.updated: tugas tidak dikenal memicu pengambilan ulang, peristiwa basi diabaikan', () => {
    const board = makeBoard();
    expect(
      apply(board, {
        type: 'card.updated',
        boardId: 'b1',
        card: cardAt('x', 'todo', NEWER),
      }),
    ).toBeNull();
    expect(
      apply(board, {
        type: 'card.updated',
        boardId: 'b1',
        card: { ...cardAt('a', 'todo', OLDER), title: 'Basi' },
      }),
    ).toBe(board);
  });

  it('card.moved memindahkan antar kolom dan mengurutkan sesuai order', () => {
    const board = makeBoard();
    const moved = apply(board, {
      type: 'card.moved',
      boardId: 'b1',
      card: cardAt('a', 'doing', NEWER),
      fromListId: 'todo',
      order: ['a', 'd'],
    });
    expect(moved && listCardIds(moved, 'todo')).toEqual(['b', 'c']);
    expect(moved && listCardIds(moved, 'doing')).toEqual(['a', 'd']);
    expect(moved?.lists[1].cards[0]).toMatchObject({
      listId: 'doing',
      updatedAt: NEWER,
    });
  });

  it('card.moved di kolom yang sama mengurutkan ulang', () => {
    const moved = apply(makeBoard(), {
      type: 'card.moved',
      boardId: 'b1',
      card: cardAt('c', 'todo', NEWER),
      fromListId: 'todo',
      order: ['c', 'a', 'b'],
    });
    expect(moved && listCardIds(moved, 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('card.moved: tugas lokal yang tidak ada di order tetap di belakang', () => {
    const board = makeBoard();
    const moved = apply(board, {
      type: 'card.moved',
      boardId: 'b1',
      card: cardAt('a', 'doing', NEWER),
      fromListId: 'todo',
      // 'd' tidak disebut, jadi tetap di belakang.
      order: ['a'],
    });
    expect(moved && listCardIds(moved, 'doing')).toEqual(['a', 'd']);
  });

  it('card.moved: basi diabaikan; tugas, kolom, atau order asing memicu pengambilan ulang', () => {
    const board = makeBoard();
    const base = { type: 'card.moved' as const, boardId: 'b1', fromListId: 'todo' };

    expect(
      apply(board, {
        ...base,
        card: cardAt('a', 'doing', OLDER),
        order: ['a', 'd'],
      }),
    ).toBe(board);
    expect(
      apply(board, { ...base, card: cardAt('x', 'doing', NEWER), order: ['x'] }),
    ).toBeNull();
    expect(
      apply(board, {
        ...base,
        card: cardAt('a', 'tidak-ada', NEWER),
        order: ['a'],
      }),
    ).toBeNull();
    expect(
      apply(board, {
        ...base,
        card: cardAt('a', 'doing', NEWER),
        order: ['a', 'asing'],
      }),
    ).toBeNull();
  });

  it('card.deleted menghapus; tugas yang sudah tidak ada diabaikan', () => {
    const board = makeBoard();
    const removed = apply(board, {
      type: 'card.deleted',
      boardId: 'b1',
      cardId: 'b',
      listId: 'todo',
    });
    expect(removed && listCardIds(removed, 'todo')).toEqual(['a', 'c']);
    expect(
      apply(board, {
        type: 'card.deleted',
        boardId: 'b1',
        cardId: 'x',
        listId: 'todo',
      }),
    ).toBe(board);
  });

  it('tidak mengubah papan asli (immutabel)', () => {
    const board = makeBoard();
    apply(board, {
      type: 'card.moved',
      boardId: 'b1',
      card: cardAt('a', 'doing', NEWER),
      fromListId: 'todo',
      order: ['a', 'd'],
    });
    expect(listCardIds(board, 'todo')).toEqual(['a', 'b', 'c']);
    expect(listCardIds(board, 'doing')).toEqual(['d']);
  });
});