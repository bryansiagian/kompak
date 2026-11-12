'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type {
  BoardDetail,
  CreateCardInput,
  CreateListInput,
  UpdateCardInput,
  UpdateListInput,
} from '@kompak/shared';
import * as api from '@/lib/api/boards';
import {
  addCardToBoard,
  addListToBoard,
  moveCardInBoard,
  moveListInBoard,
  removeCardFromBoard,
  removeListFromBoard,
  replaceCardInBoard,
  replaceListInBoard,
} from './board-cache';

export const boardKey = (boardId: string) => ['board', boardId] as const;

function updateBoard(
  queryClient: QueryClient,
  boardId: string,
  update: (board: BoardDetail) => BoardDetail,
): void {
  queryClient.setQueryData<BoardDetail>(boardKey(boardId), (board) =>
    board ? update(board) : board,
  );
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: boardKey(boardId),
    queryFn: () => api.getBoard(boardId),
  });
}

export function useCreateList(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListInput) => api.createList(boardId, input),
    onSuccess: (list) =>
      updateBoard(queryClient, boardId, (board) => addListToBoard(board, list)),
  });
}

export function useRenameList(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { listId: string; input: UpdateListInput }) =>
      api.renameList(variables.listId, variables.input),
    onSuccess: (list) =>
      updateBoard(queryClient, boardId, (board) =>
        replaceListInBoard(board, list),
      ),
  });
}

export function useDeleteList(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.deleteList(listId),
    onSuccess: (_result, listId) =>
      updateBoard(queryClient, boardId, (board) =>
        removeListFromBoard(board, listId),
      ),
  });
}

interface MoveListVariables {
  listId: string;
  beforeListId: string | null;
}

export function useMoveList(boardId: string) {
  const queryClient = useQueryClient();
  const key = boardKey(boardId);
  return useMutation({
    mutationFn: (variables: MoveListVariables) =>
      api.moveList(variables.listId, { beforeListId: variables.beforeListId }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      updateBoard(queryClient, boardId, (board) =>
        moveListInBoard(board, variables.listId, variables.beforeListId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    // Menyelaraskan dengan urutan dan posisi dari server.
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { listId: string; input: CreateCardInput }) =>
      api.createCard(variables.listId, variables.input),
    onSuccess: (card) =>
      updateBoard(queryClient, boardId, (board) => addCardToBoard(board, card)),
  });
}

export function useUpdateCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { cardId: string; input: UpdateCardInput }) =>
      api.updateCard(variables.cardId, variables.input),
    onSuccess: (card) =>
      updateBoard(queryClient, boardId, (board) =>
        replaceCardInBoard(board, card),
      ),
  });
}

export function useDeleteCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => api.deleteCard(cardId),
    onSuccess: (_result, cardId) =>
      updateBoard(queryClient, boardId, (board) =>
        removeCardFromBoard(board, cardId),
      ),
  });
}

interface MoveCardVariables {
  cardId: string;
  listId: string;
  beforeCardId: string | null;
  // Diisi saat drag and drop: cache sudah menampilkan hasilnya, jadi ini hanya
  // keadaan sebelum drag untuk rollback.
  rollbackTo?: BoardDetail;
}

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient();
  const key = boardKey(boardId);
  return useMutation({
    mutationFn: (variables: MoveCardVariables) =>
      api.moveCard(variables.cardId, {
        listId: variables.listId,
        beforeCardId: variables.beforeCardId,
      }),
    onMutate: async (variables) => {
      if (variables.rollbackTo) {
        return { previous: variables.rollbackTo as BoardDetail | undefined };
      }
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      updateBoard(queryClient, boardId, (board) =>
        moveCardInBoard(
          board,
          variables.cardId,
          variables.listId,
          variables.beforeCardId,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}