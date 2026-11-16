import {
  activityListSchema,
  commentListSchema,
  commentSchema,
} from '@kompak/shared';
import type { CreateCommentInput, UpdateCommentInput } from '@kompak/shared';
import { apiNoContent, apiRequest } from './client';

const enc = encodeURIComponent;

export interface ActivityPageParams {
  limit: number;
  // Ambil catatan yang lebih lama dari waktu ini (halaman berikutnya).
  before?: string;
}

function activityQuery(params: ActivityPageParams): string {
  const query = new URLSearchParams({ limit: String(params.limit) });
  if (params.before) {
    query.set('before', params.before);
  }
  return query.toString();
}

export function listComments(cardId: string) {
  return apiRequest(`/cards/${enc(cardId)}/comments`, {
    schema: commentListSchema,
  });
}

export function createComment(cardId: string, input: CreateCommentInput) {
  return apiRequest(`/cards/${enc(cardId)}/comments`, {
    method: 'POST',
    body: input,
    schema: commentSchema,
  });
}

export function updateComment(commentId: string, input: UpdateCommentInput) {
  return apiRequest(`/comments/${enc(commentId)}`, {
    method: 'PATCH',
    body: input,
    schema: commentSchema,
  });
}

export function deleteComment(commentId: string) {
  return apiNoContent(`/comments/${enc(commentId)}`, { method: 'DELETE' });
}

export function listBoardActivity(boardId: string, params: ActivityPageParams) {
  return apiRequest(`/boards/${enc(boardId)}/activity?${activityQuery(params)}`, {
    schema: activityListSchema,
  });
}

export function listCardActivity(cardId: string, params: ActivityPageParams) {
  return apiRequest(`/cards/${enc(cardId)}/activity?${activityQuery(params)}`, {
    schema: activityListSchema,
  });
}