import type { BoardDetail, Card } from '@kompak/shared';

export function makeCard(id: string, listId: string): Card {
  return {
    id,
    listId,
    boardId: 'b1',
    title: id.toUpperCase(),
    description: '',
    assigneeId: null,
    dueDate: null,
    position: 0,
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// todo: A B C | doing: D | done: (kosong)
export function makeBoard(): BoardDetail {
  return {
    id: 'b1',
    workspaceId: 'w1',
    name: 'Papan',
    createdAt: '2026-01-01T00:00:00.000Z',
    lists: [
      {
        id: 'todo',
        boardId: 'b1',
        name: 'Belum dikerjakan',
        position: 1024,
        cards: [makeCard('a', 'todo'), makeCard('b', 'todo'), makeCard('c', 'todo')],
      },
      {
        id: 'doing',
        boardId: 'b1',
        name: 'Sedang dikerjakan',
        position: 2048,
        cards: [makeCard('d', 'doing')],
      },
      {
        id: 'done',
        boardId: 'b1',
        name: 'Selesai',
        position: 3072,
        cards: [],
      },
    ],
  };
}