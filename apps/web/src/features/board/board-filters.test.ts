import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, matchesFilters, filteredBoard } from './board-filters';
import { makeBoard, makeCard } from './test-fixtures';
describe('board filters', () => {
  it('tanpa filter menampilkan semua', () =>
    expect(
      filteredBoard(makeBoard(), EMPTY_FILTERS, '2026-11-17').lists[0].cards,
    ).toHaveLength(3));
  it('mencocokkan assignee', () =>
    expect(
      matchesFilters(
        { ...makeCard('a', 'todo'), assigneeId: 'u1' },
        { ...EMPTY_FILTERS, assigneeId: 'u2' },
        '2026-11-17',
      ),
    ).toBe(false));
  it('mencocokkan label', () =>
    expect(
      matchesFilters(
        { ...makeCard('a', 'todo'), labelIds: ['a'] },
        { ...EMPTY_FILTERS, labelId: 'a' },
        '2026-11-17',
      ),
    ).toBe(true));
  it('tanggal terlambat', () =>
    expect(
      matchesFilters(
        { ...makeCard('a', 'todo'), dueDate: '2026-11-16' },
        { ...EMPTY_FILTERS, due: 'overdue' },
        '2026-11-17',
      ),
    ).toBe(true));
  it('minggu termasuk hari Senin sampai Minggu', () =>
    expect(
      matchesFilters(
        { ...makeCard('a', 'todo'), dueDate: '2026-11-22' },
        { ...EMPTY_FILTERS, due: 'week' },
        '2026-11-17',
      ),
    ).toBe(true));
  it('searches titles and descriptions within the active filters', () => {
    const board = makeBoard();
    const lane = board.lists[0];
    lane.cards = [
      {
        ...makeCard('title', lane.id),
        title: 'Bahan Presentasi',
        assigneeId: 'u1',
      },
      {
        ...makeCard('description', lane.id),
        description: 'Siapkan presentasi',
        assigneeId: 'u1',
      },
      {
        ...makeCard('excluded', lane.id),
        title: 'Presentasi lain',
        assigneeId: 'u2',
      },
      makeCard('different', lane.id),
    ];
    const filtered = filteredBoard(
      board,
      { ...EMPTY_FILTERS, assigneeId: 'u1' },
      '2026-11-17',
      ' PRESENTASI ',
    );
    expect(filtered.lists[0].cards.map((card) => card.id)).toEqual([
      'title',
      'description',
    ]);
    expect(lane.cards).toHaveLength(4);
  });
});
