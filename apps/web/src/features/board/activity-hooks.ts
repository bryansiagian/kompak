'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api/collaboration';

export const BOARD_ACTIVITY_PAGE_SIZE = 30;
export const CARD_ACTIVITY_LIMIT = 20;

export const boardActivityKey = (boardId: string) =>
  ['board-activity', boardId] as const;
export const cardActivityRootKey = ['card-activity'] as const;
export const cardActivityKey = (cardId: string) =>
  ['card-activity', cardId] as const;

export function useBoardActivity(boardId: string) {
  return useInfiniteQuery({
    queryKey: boardActivityKey(boardId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBoardActivity(boardId, {
        limit: BOARD_ACTIVITY_PAGE_SIZE,
        before: pageParam,
      }),
    // Halaman penuh berarti mungkin masih ada yang lebih lama.
    getNextPageParam: (lastPage) =>
      lastPage.length < BOARD_ACTIVITY_PAGE_SIZE
        ? undefined
        : lastPage.at(-1)?.createdAt,
  });
}

export function useCardActivity(cardId: string) {
  return useQuery({
    queryKey: cardActivityKey(cardId),
    queryFn: () => api.listCardActivity(cardId, { limit: CARD_ACTIVITY_LIMIT }),
  });
}