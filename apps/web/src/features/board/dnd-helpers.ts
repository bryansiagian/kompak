import type { BoardDetail } from '@kompak/shared';
import {
  arrayMove,
  findListIdOfCard,
  listCardIds,
  moveCardInBoard,
} from './board-cache';
import type { Placement } from './board-cache';

const LIST_DROPPABLE_PREFIX = 'list:';

// ID area lepas milik kolom dibedakan dari ID tugas lewat awalan.
export function listDroppableId(listId: string): string {
  return `${LIST_DROPPABLE_PREFIX}${listId}`;
}

export function parseListDroppableId(id: string): string | null {
  return id.startsWith(LIST_DROPPABLE_PREFIX)
    ? id.slice(LIST_DROPPABLE_PREFIX.length)
    : null;
}

// Dipanggil saat tugas melewati kolom lain: pindahkan sementara di cache agar
// kolom tujuan langsung memberi tempat. Urutan di kolom yang sama baru
// ditentukan saat dilepas (dropPlacement), seperti contoh resmi dnd-kit.
export function applyDragOver(
  board: BoardDetail,
  activeId: string,
  overId: string,
  placeAfter: boolean,
): BoardDetail {
  const overListFromContainer = parseListDroppableId(overId);
  const activeListId = findListIdOfCard(board, activeId);
  const overListId = overListFromContainer ?? findListIdOfCard(board, overId);
  if (!activeListId || !overListId || activeListId === overListId) {
    return board;
  }

  if (overListFromContainer !== null) {
    return moveCardInBoard(board, activeId, overListId, null);
  }

  let beforeCardId: string | null = overId;
  if (placeAfter) {
    const ids = listCardIds(board, overListId);
    beforeCardId = ids[ids.indexOf(overId) + 1] ?? null;
  }
  return moveCardInBoard(board, activeId, overListId, beforeCardId);
}

// Penempatan akhir saat dilepas, dalam bentuk yang sama dengan permintaan ke API.
export function dropPlacement(
  board: BoardDetail,
  activeId: string,
  overId: string,
): Placement | null {
  const listId = findListIdOfCard(board, activeId);
  if (!listId) {
    return null;
  }

  const ids = listCardIds(board, listId);
  let finalIds = ids;
  const overIsSiblingCard =
    overId !== activeId &&
    parseListDroppableId(overId) === null &&
    findListIdOfCard(board, overId) === listId;
  if (overIsSiblingCard) {
    finalIds = arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId));
  }

  const index = finalIds.indexOf(activeId);
  return { listId, beforeCardId: finalIds[index + 1] ?? null };
}

// Nama kolom yang sedang disentuh (untuk pengumuman pembaca layar).
export function targetListName(board: BoardDetail, overId: string): string | null {
  const listId = parseListDroppableId(overId) ?? findListIdOfCard(board, overId);
  return board.lists.find((list) => list.id === listId)?.name ?? null;
}