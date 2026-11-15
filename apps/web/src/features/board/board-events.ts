import type { BoardDetail, BoardEvent, Card } from '@kompak/shared';
import {
  addCardToBoard,
  addListToBoard,
  moveCardInBoard,
  removeCardFromBoard,
  removeListFromBoard,
  replaceCardInBoard,
  replaceListInBoard,
} from './board-cache';

function findCard(board: BoardDetail, cardId: string): Card | undefined {
  return board.lists
    .flatMap((list) => list.cards)
    .find((card) => card.id === cardId);
}

// Urutkan sesuai `order`; elemen lokal yang tidak disebut tetap di belakang.
// null bila `order` menyebut ID yang tidak dikenal (cache tertinggal).
function sortByOrder<T extends { id: string }>(
  items: readonly T[],
  order: readonly string[],
): T[] | null {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (!item) {
      return null;
    }
    ordered.push(item);
  }
  const listed = new Set(order);
  return [...ordered, ...items.filter((item) => !listed.has(item.id))];
}

export function reorderLists(
  board: BoardDetail,
  order: readonly string[],
): BoardDetail | null {
  const lists = sortByOrder(board.lists, order);
  return lists ? { ...board, lists } : null;
}

export function reorderCards(
  board: BoardDetail,
  listId: string,
  order: readonly string[],
): BoardDetail | null {
  const list = board.lists.find((item) => item.id === listId);
  if (!list) {
    return null;
  }
  const cards = sortByOrder(list.cards, order);
  if (!cards) {
    return null;
  }
  return {
    ...board,
    lists: board.lists.map((item) =>
      item.id === listId ? { ...item, cards } : item,
    ),
  };
}

// Hanya isi tugas yang diubah; kolom dan urutannya tidak disentuh.
function patchCard(board: BoardDetail, card: Card): BoardDetail {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((item) =>
        item.id === card.id
          ? {
              ...item,
              title: card.title,
              description: card.description,
              assigneeId: card.assigneeId,
              dueDate: card.dueDate,
              updatedAt: card.updatedAt,
            }
          : item,
      ),
    })),
  };
}

// Menerapkan peristiwa dari server ke cache papan.
// - Mengembalikan papan yang sama persis bila tidak ada yang perlu diubah.
// - Mengembalikan null bila peristiwa tidak konsisten dengan cache: pemanggil
//   sebaiknya mengambil ulang papan, bukan menebak.
// Semua cabang idempoten, karena perubahan kita sendiri juga kembali sebagai peristiwa.
export function applyBoardEvent(
  board: BoardDetail,
  event: BoardEvent,
): BoardDetail | null {
  switch (event.type) {
    case 'presence.updated':
    case 'board.deleted':
      return board;

    case 'board.updated':
      return board.name === event.board.name
        ? board
        : { ...board, name: event.board.name };

    case 'list.created':
      return board.lists.some((list) => list.id === event.list.id)
        ? board
        : addListToBoard(board, event.list);

    case 'list.updated':
      return board.lists.some((list) => list.id === event.list.id)
        ? replaceListInBoard(board, event.list)
        : null;

    case 'list.moved':
      return board.lists.some((list) => list.id === event.list.id)
        ? reorderLists(replaceListInBoard(board, event.list), event.order)
        : null;

    case 'list.deleted':
      return board.lists.some((list) => list.id === event.listId)
        ? removeListFromBoard(board, event.listId)
        : board;

    case 'card.created':
      if (findCard(board, event.card.id)) {
        return board;
      }
      return board.lists.some((list) => list.id === event.card.listId)
        ? addCardToBoard(board, event.card)
        : null;

    case 'card.updated': {
      const existing = findCard(board, event.card.id);
      if (!existing) {
        return null;
      }
      // Peristiwa basi (sudah ada versi yang lebih baru di cache).
      if (existing.updatedAt > event.card.updatedAt) {
        return board;
      }
      return patchCard(board, event.card);
    }

    case 'card.moved': {
      const existing = findCard(board, event.card.id);
      if (!existing) {
        return null;
      }
      if (existing.updatedAt > event.card.updatedAt) {
        return board;
      }
      if (!board.lists.some((list) => list.id === event.card.listId)) {
        return null;
      }
      const moved = replaceCardInBoard(
        moveCardInBoard(board, event.card.id, event.card.listId, null),
        event.card,
      );
      return reorderCards(moved, event.card.listId, event.order);
    }

    case 'card.deleted':
      return findCard(board, event.cardId)
        ? removeCardFromBoard(board, event.cardId)
        : board;
  }
}