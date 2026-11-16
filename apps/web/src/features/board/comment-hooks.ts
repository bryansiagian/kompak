'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Comment, CreateCommentInput, UpdateCommentInput } from '@kompak/shared';
import * as api from '@/lib/api/collaboration';
import { removeComment, upsertComment } from './comments-cache';

// Akar kunci tersendiri (bukan turunan ['board', id]) agar menyegarkan papan
// tidak ikut mengambil ulang komentar.
export const commentsRootKey = ['card-comments'] as const;
export const commentsKey = (cardId: string) => ['card-comments', cardId] as const;

export function useComments(cardId: string) {
  return useQuery({
    queryKey: commentsKey(cardId),
    queryFn: () => api.listComments(cardId),
  });
}

export function useCreateComment(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => api.createComment(cardId, input),
    onSuccess: (comment) =>
      queryClient.setQueryData<Comment[]>(commentsKey(cardId), (current) =>
        current ? upsertComment(current, comment) : current,
      ),
  });
}

export function useUpdateComment(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { commentId: string; input: UpdateCommentInput }) =>
      api.updateComment(variables.commentId, variables.input),
    onSuccess: (comment) =>
      queryClient.setQueryData<Comment[]>(commentsKey(cardId), (current) =>
        current ? upsertComment(current, comment) : current,
      ),
  });
}

export function useDeleteComment(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: (_result, commentId) =>
      queryClient.setQueryData<Comment[]>(commentsKey(cardId), (current) =>
        current ? removeComment(current, commentId) : current,
      ),
  });
}