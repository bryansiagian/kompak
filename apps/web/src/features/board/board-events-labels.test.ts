import { describe, expect, it } from 'vitest';
import type { BoardDetail, Label } from '@kompak/shared';
import { replaceCardInBoard } from './board-cache';
import { applyBoardEvent } from './board-events';
import { makeBoard, makeCard } from './test-fixtures';

const NEWER = '2026-01-02T00:00:00.000Z';

const label = (id: string, name = id): Label => ({
  id,
  boardId: 'b1',
  name,
  color: 'emerald',
});

function boardWithLabels(): BoardDetail {
  const base = { ...makeBoard(), labels: [label('l1'), label('l2')] };
  return replaceCardInBoard(base, {
    ...makeCard('a', 'todo'),
    labelIds: ['l1', 'l2'],
  });
}

describe('peristiwa label di cache papan', () => {
  it('label.created menambah label; duplikat diabaikan', () => {
    const board = makeBoard();
    const added = applyBoardEvent(board, {
      type: 'label.created',
      boardId: 'b1',
      label: label('l1'),
    });
    expect(added?.labels.map((item) => item.id)).toEqual(['l1']);
    expect(
      added &&
        applyBoardEvent(added, {
          type: 'label.created',
          boardId: 'b1',
          label: label('l1'),
        }),
    ).toBe(added);
  });

  it('label.updated mengganti nama dan warna; label tak dikenal memicu pengambilan ulang', () => {
    const board = boardWithLabels();
    const updated = applyBoardEvent(board, {
      type: 'label.updated',
      boardId: 'b1',
      label: { ...label('l1', 'Penting'), color: 'rose' },
    });
    expect(updated?.labels[0]).toMatchObject({ name: 'Penting', color: 'rose' });
    expect(
      applyBoardEvent(board, {
        type: 'label.updated',
        boardId: 'b1',
        label: label('tidak-ada'),
      }),
    ).toBeNull();
  });

  it('label.deleted melepas label dari semua tugas; idempoten', () => {
    const board = boardWithLabels();
    const removed = applyBoardEvent(board, {
      type: 'label.deleted',
      boardId: 'b1',
      labelId: 'l1',
    });
    expect(removed?.labels.map((item) => item.id)).toEqual(['l2']);
    expect(removed?.lists[0].cards[0].labelIds).toEqual(['l2']);

    expect(
      removed &&
        applyBoardEvent(removed, {
          type: 'label.deleted',
          boardId: 'b1',
          labelId: 'l1',
        }),
    ).toBe(removed);
  });

  it('card.updated ikut menerapkan labelIds', () => {
    const board = makeBoard();
    const updated = applyBoardEvent(board, {
      type: 'card.updated',
      boardId: 'b1',
      card: { ...makeCard('b', 'todo'), labelIds: ['l1'], updatedAt: NEWER },
    });
    expect(updated?.lists[0].cards[1].labelIds).toEqual(['l1']);
  });
});