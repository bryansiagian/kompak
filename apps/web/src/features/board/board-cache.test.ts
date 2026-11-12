import { describe, expect, it } from 'vitest';
import {
  addCardToBoard,
  addListToBoard,
  arrayMove,
  findListIdOfCard,
  listCardIds,
  moveCardInBoard,
  moveListInBoard,
  placementOf,
  removeCardFromBoard,
  removeListFromBoard,
  replaceCardInBoard,
  replaceListInBoard,
  samePlacement,
  stepListPlacement,
  stepPlacement,
} from './board-cache';
import { makeBoard, makeCard } from './test-fixtures';

describe('arrayMove', () => {
  it('memindahkan elemen tanpa mengubah array asli', () => {
    const source = ['a', 'b', 'c'];
    expect(arrayMove(source, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(arrayMove(source, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(source).toEqual(['a', 'b', 'c']);
  });

  it('indeks asal di luar jangkauan mengembalikan salinan apa adanya', () => {
    expect(arrayMove(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('moveCardInBoard', () => {
  it('di kolom yang sama: sebelum tugas lain', () => {
    const next = moveCardInBoard(makeBoard(), 'c', 'todo', 'a');
    expect(listCardIds(next, 'todo')).toEqual(['c', 'a', 'b']);
  });

  it('di kolom yang sama: ke paling bawah', () => {
    const next = moveCardInBoard(makeBoard(), 'a', 'todo', null);
    expect(listCardIds(next, 'todo')).toEqual(['b', 'c', 'a']);
  });

  it('antar kolom: sebelum jangkar dan memperbarui listId', () => {
    const next = moveCardInBoard(makeBoard(), 'b', 'doing', 'd');
    expect(listCardIds(next, 'todo')).toEqual(['a', 'c']);
    expect(listCardIds(next, 'doing')).toEqual(['b', 'd']);
    expect(next.lists[1].cards[0].listId).toBe('doing');
  });

  it('ke kolom kosong', () => {
    const next = moveCardInBoard(makeBoard(), 'a', 'done', null);
    expect(listCardIds(next, 'done')).toEqual(['a']);
    expect(listCardIds(next, 'todo')).toEqual(['b', 'c']);
  });

  it('jangkar yang tidak dikenal menaruh tugas di akhir kolom', () => {
    const next = moveCardInBoard(makeBoard(), 'a', 'doing', 'tidak-ada');
    expect(listCardIds(next, 'doing')).toEqual(['d', 'a']);
  });

  it('tugas atau kolom yang tidak dikenal mengembalikan papan yang sama persis', () => {
    const board = makeBoard();
    expect(moveCardInBoard(board, 'x', 'todo', null)).toBe(board);
    expect(moveCardInBoard(board, 'a', 'x', null)).toBe(board);
  });

  it('tidak mengubah papan asli (immutabel)', () => {
    const board = makeBoard();
    moveCardInBoard(board, 'a', 'doing', null);
    expect(listCardIds(board, 'todo')).toEqual(['a', 'b', 'c']);
    expect(listCardIds(board, 'doing')).toEqual(['d']);
  });
});

describe('moveListInBoard', () => {
  const order = (lists: { id: string }[]) => lists.map((list) => list.id);

  it('sebelum kolom lain atau ke paling akhir', () => {
    const board = makeBoard();
    expect(order(moveListInBoard(board, 'done', 'todo').lists)).toEqual([
      'done',
      'todo',
      'doing',
    ]);
    expect(order(moveListInBoard(board, 'todo', null).lists)).toEqual([
      'doing',
      'done',
      'todo',
    ]);
  });

  it('kolom tidak dikenal mengembalikan papan yang sama', () => {
    const board = makeBoard();
    expect(moveListInBoard(board, 'x', null)).toBe(board);
  });
});

describe('placementOf', () => {
  it('mengembalikan kolom dan tugas setelahnya', () => {
    const board = makeBoard();
    expect(placementOf(board, 'a')).toEqual({ listId: 'todo', beforeCardId: 'b' });
    expect(placementOf(board, 'c')).toEqual({ listId: 'todo', beforeCardId: null });
    expect(placementOf(board, 'x')).toBeNull();
  });

  it('samePlacement membandingkan kolom dan jangkar', () => {
    expect(
      samePlacement(
        { listId: 'todo', beforeCardId: 'b' },
        { listId: 'todo', beforeCardId: 'b' },
      ),
    ).toBe(true);
    expect(
      samePlacement(
        { listId: 'todo', beforeCardId: 'b' },
        { listId: 'doing', beforeCardId: 'b' },
      ),
    ).toBe(false);
  });
});

describe('stepPlacement', () => {
  const board = makeBoard();

  it('naik satu langkah', () => {
    expect(stepPlacement(board, 'c', 'up')).toEqual({
      listId: 'todo',
      beforeCardId: 'b',
    });
    expect(stepPlacement(board, 'a', 'up')).toBeNull();
  });

  it('turun satu langkah', () => {
    expect(stepPlacement(board, 'a', 'down')).toEqual({
      listId: 'todo',
      beforeCardId: 'c',
    });
    expect(stepPlacement(board, 'b', 'down')).toEqual({
      listId: 'todo',
      beforeCardId: null,
    });
    expect(stepPlacement(board, 'c', 'down')).toBeNull();
  });

  it('hasil langkah benar bila diterapkan ke papan', () => {
    const up = stepPlacement(board, 'c', 'up');
    const down = stepPlacement(board, 'a', 'down');
    expect(up && listCardIds(moveCardInBoard(board, 'c', up.listId, up.beforeCardId), 'todo')).toEqual(['a', 'c', 'b']);
    expect(down && listCardIds(moveCardInBoard(board, 'a', down.listId, down.beforeCardId), 'todo')).toEqual(['b', 'a', 'c']);
  });
});

describe('stepListPlacement', () => {
  const board = makeBoard();

  it('geser ke kiri dan kanan', () => {
    expect(stepListPlacement(board, 'doing', 'left')).toEqual({
      beforeListId: 'todo',
    });
    expect(stepListPlacement(board, 'todo', 'right')).toEqual({
      beforeListId: 'done',
    });
    expect(stepListPlacement(board, 'doing', 'right')).toEqual({
      beforeListId: null,
    });
  });

  it('null di ujung dan untuk kolom tak dikenal', () => {
    expect(stepListPlacement(board, 'todo', 'left')).toBeNull();
    expect(stepListPlacement(board, 'done', 'right')).toBeNull();
    expect(stepListPlacement(board, 'x', 'left')).toBeNull();
  });
});

describe('perubahan tugas dan kolom di cache', () => {
  it('menambah tugas di akhir kolomnya', () => {
    const next = addCardToBoard(makeBoard(), makeCard('e', 'doing'));
    expect(listCardIds(next, 'doing')).toEqual(['d', 'e']);
  });

  it('mengganti isi tugas tanpa mengubah urutan', () => {
    const board = makeBoard();
    const updated = { ...makeCard('b', 'todo'), title: 'Baru' };
    const next = replaceCardInBoard(board, updated);
    expect(listCardIds(next, 'todo')).toEqual(['a', 'b', 'c']);
    expect(next.lists[0].cards[1].title).toBe('Baru');
  });

  it('menghapus tugas', () => {
    const next = removeCardFromBoard(makeBoard(), 'b');
    expect(listCardIds(next, 'todo')).toEqual(['a', 'c']);
    expect(findListIdOfCard(next, 'b')).toBeNull();
  });

  it('menambah, mengganti nama, dan menghapus kolom', () => {
    const added = addListToBoard(makeBoard(), {
      id: 'review',
      boardId: 'b1',
      name: 'Review',
      position: 4096,
    });
    expect(added.lists.map((list) => list.id)).toEqual([
      'todo',
      'doing',
      'done',
      'review',
    ]);
    expect(added.lists[3].cards).toEqual([]);

    const renamed = replaceListInBoard(added, {
      id: 'review',
      boardId: 'b1',
      name: 'Ditinjau',
      position: 4096,
    });
    expect(renamed.lists[3].name).toBe('Ditinjau');

    const removed = removeListFromBoard(renamed, 'todo');
    expect(removed.lists.map((list) => list.id)).toEqual([
      'doing',
      'done',
      'review',
    ]);
  });
});