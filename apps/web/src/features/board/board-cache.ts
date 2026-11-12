import type { BoardDetail, Card, List, ListWithCards } from '@kompak/shared';

export interface Placement {
  listId: string;
  // Tugas yang harus berada tepat setelah tugas ini; null = paling bawah.
  beforeCardId: string | null;
}

export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function findListIdOfCard(board: BoardDetail, cardId: string): string | null {
  for (const list of board.lists) {
    if (list.cards.some((card) => card.id === cardId)) {
      return list.id;
    }
  }
  return null;
}

export function listCardIds(board: BoardDetail, listId: string): string[] {
  return (
    board.lists.find((list) => list.id === listId)?.cards.map((card) => card.id) ??
    []
  );
}

// Tempat sebuah tugas sekarang, dalam bentuk yang sama dengan permintaan ke API.
export function placementOf(board: BoardDetail, cardId: string): Placement | null {
  const listId = findListIdOfCard(board, cardId);
  if (!listId) {
    return null;
  }
  const ids = listCardIds(board, listId);
  return { listId, beforeCardId: ids[ids.indexOf(cardId) + 1] ?? null };
}

export function samePlacement(a: Placement, b: Placement): boolean {
  return a.listId === b.listId && a.beforeCardId === b.beforeCardId;
}

// Naik atau turun satu langkah di kolom yang sama; null bila sudah di ujung.
export function stepPlacement(
  board: BoardDetail,
  cardId: string,
  direction: 'up' | 'down',
): Placement | null {
  const listId = findListIdOfCard(board, cardId);
  if (!listId) {
    return null;
  }
  const ids = listCardIds(board, listId);
  const index = ids.indexOf(cardId);
  if (direction === 'up') {
    return index > 0 ? { listId, beforeCardId: ids[index - 1] } : null;
  }
  return index < ids.length - 1
    ? { listId, beforeCardId: ids[index + 2] ?? null }
    : null;
}

// Geser kolom ke kiri atau kanan; null bila sudah di ujung.
export function stepListPlacement(
  board: BoardDetail,
  listId: string,
  direction: 'left' | 'right',
): { beforeListId: string | null } | null {
  const ids = board.lists.map((list) => list.id);
  const index = ids.indexOf(listId);
  if (index === -1) {
    return null;
  }
  if (direction === 'left') {
    return index > 0 ? { beforeListId: ids[index - 1] } : null;
  }
  return index < ids.length - 1
    ? { beforeListId: ids[index + 2] ?? null }
    : null;
}

export function moveCardInBoard(
  board: BoardDetail,
  cardId: string,
  listId: string,
  beforeCardId: string | null,
): BoardDetail {
  const card = board.lists
    .flatMap((list) => list.cards)
    .find((item) => item.id === cardId);
  if (!card || !board.lists.some((list) => list.id === listId)) {
    return board;
  }

  const lists = board.lists.map((list) => {
    const remaining = list.cards.filter((item) => item.id !== cardId);
    if (list.id !== listId) {
      return { ...list, cards: remaining };
    }
    const moved = { ...card, listId };
    const index =
      beforeCardId === null
        ? -1
        : remaining.findIndex((item) => item.id === beforeCardId);
    const cards =
      index === -1
        ? [...remaining, moved]
        : [...remaining.slice(0, index), moved, ...remaining.slice(index)];
    return { ...list, cards };
  });
  return { ...board, lists };
}

export function moveListInBoard(
  board: BoardDetail,
  listId: string,
  beforeListId: string | null,
): BoardDetail {
  const list = board.lists.find((item) => item.id === listId);
  if (!list) {
    return board;
  }
  const others = board.lists.filter((item) => item.id !== listId);
  const index =
    beforeListId === null
      ? -1
      : others.findIndex((item) => item.id === beforeListId);
  const lists: ListWithCards[] =
    index === -1
      ? [...others, list]
      : [...others.slice(0, index), list, ...others.slice(index)];
  return { ...board, lists };
}

export function addCardToBoard(board: BoardDetail, card: Card): BoardDetail {
  return {
    ...board,
    lists: board.lists.map((list) =>
      list.id === card.listId ? { ...list, cards: [...list.cards, card] } : list,
    ),
  };
}

export function replaceCardInBoard(board: BoardDetail, card: Card): BoardDetail {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((item) => (item.id === card.id ? card : item)),
    })),
  };
}

export function removeCardFromBoard(
  board: BoardDetail,
  cardId: string,
): BoardDetail {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((item) => item.id !== cardId),
    })),
  };
}

export function addListToBoard(board: BoardDetail, list: List): BoardDetail {
  return { ...board, lists: [...board.lists, { ...list, cards: [] }] };
}

export function replaceListInBoard(board: BoardDetail, list: List): BoardDetail {
  return {
    ...board,
    lists: board.lists.map((item) =>
      item.id === list.id
        ? { ...item, name: list.name, position: list.position }
        : item,
    ),
  };
}

export function removeListFromBoard(
  board: BoardDetail,
  listId: string,
): BoardDetail {
  return { ...board, lists: board.lists.filter((item) => item.id !== listId) };
}