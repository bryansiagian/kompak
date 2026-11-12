import { describe, expect, it } from 'vitest';
import { listCardIds } from './board-cache';
import {
  applyDragOver,
  dropPlacement,
  listDroppableId,
  parseListDroppableId,
  targetListName,
} from './dnd-helpers';
import { makeBoard } from './test-fixtures';

describe('listDroppableId', () => {
  it('membedakan ID kolom dari ID tugas', () => {
    expect(listDroppableId('todo')).toBe('list:todo');
    expect(parseListDroppableId('list:todo')).toBe('todo');
    expect(parseListDroppableId('a')).toBeNull();
  });
});

describe('applyDragOver', () => {
  it('di kolom yang sama tidak mengubah apa pun', () => {
    const board = makeBoard();
    expect(applyDragOver(board, 'a', 'c', false)).toBe(board);
    expect(applyDragOver(board, 'a', listDroppableId('todo'), false)).toBe(board);
  });

  it('melewati tugas di kolom lain: masuk sebelum tugas itu', () => {
    const next = applyDragOver(makeBoard(), 'a', 'd', false);
    expect(listCardIds(next, 'doing')).toEqual(['a', 'd']);
    expect(listCardIds(next, 'todo')).toEqual(['b', 'c']);
  });

  it('bagian bawah tugas di kolom lain: masuk setelah tugas itu', () => {
    const next = applyDragOver(makeBoard(), 'a', 'd', true);
    expect(listCardIds(next, 'doing')).toEqual(['d', 'a']);
  });

  it('melewati kolom kosong: masuk ke dalamnya', () => {
    const next = applyDragOver(makeBoard(), 'b', listDroppableId('done'), false);
    expect(listCardIds(next, 'done')).toEqual(['b']);
  });

  it('tujuan atau tugas yang tidak dikenal tidak mengubah papan', () => {
    const board = makeBoard();
    expect(applyDragOver(board, 'x', 'd', false)).toBe(board);
    expect(applyDragOver(board, 'a', 'x', false)).toBe(board);
  });
});

describe('dropPlacement', () => {
  it('urut ulang di kolom yang sama ke bawah: setelah tugas tujuan', () => {
    expect(dropPlacement(makeBoard(), 'a', 'c')).toEqual({
      listId: 'todo',
      beforeCardId: null,
    });
    expect(dropPlacement(makeBoard(), 'a', 'b')).toEqual({
      listId: 'todo',
      beforeCardId: 'c',
    });
  });

  it('urut ulang di kolom yang sama ke atas: sebelum tugas tujuan', () => {
    expect(dropPlacement(makeBoard(), 'c', 'a')).toEqual({
      listId: 'todo',
      beforeCardId: 'a',
    });
  });

  it('dilepas tepat di tempatnya sendiri: penempatan tidak berubah', () => {
    expect(dropPlacement(makeBoard(), 'b', 'b')).toEqual({
      listId: 'todo',
      beforeCardId: 'c',
    });
  });

  it('setelah pindah kolom lewat dragOver: membaca kolom dan urutan terbaru', () => {
    const moved = applyDragOver(makeBoard(), 'a', 'd', false);
    expect(dropPlacement(moved, 'a', 'a')).toEqual({
      listId: 'doing',
      beforeCardId: 'd',
    });
  });

  it('dilepas di area kolom kosong', () => {
    const moved = applyDragOver(makeBoard(), 'a', listDroppableId('done'), false);
    expect(dropPlacement(moved, 'a', listDroppableId('done'))).toEqual({
      listId: 'done',
      beforeCardId: null,
    });
  });

  it('tugas yang tidak dikenal menghasilkan null', () => {
    expect(dropPlacement(makeBoard(), 'x', 'a')).toBeNull();
  });
});

describe('targetListName', () => {
  it('mengambil nama kolom dari area kolom maupun dari tugas', () => {
    const board = makeBoard();
    expect(targetListName(board, listDroppableId('done'))).toBe('Selesai');
    expect(targetListName(board, 'd')).toBe('Sedang dikerjakan');
    expect(targetListName(board, 'x')).toBeNull();
  });
});