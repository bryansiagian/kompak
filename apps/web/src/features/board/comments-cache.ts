import type { BoardEvent, Comment } from '@kompak/shared';

export type CommentEvent = Extract<
  BoardEvent,
  { type: 'comment.created' | 'comment.updated' | 'comment.deleted' }
>;

function byCreatedAt(a: Comment, b: Comment): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function upsertComment(comments: Comment[], comment: Comment): Comment[] {
  const existing = comments.find((item) => item.id === comment.id);
  if (!existing) {
    return [...comments, comment].sort(byCreatedAt);
  }
  // Versi yang sama atau lebih lama (peristiwa basi, atau gema perubahan kita
  // sendiri): abaikan.
  if (existing.updatedAt >= comment.updatedAt) {
    return comments;
  }
  return comments.map((item) => (item.id === comment.id ? comment : item));
}

export function removeComment(comments: Comment[], commentId: string): Comment[] {
  return comments.some((item) => item.id === commentId)
    ? comments.filter((item) => item.id !== commentId)
    : comments;
}

// Mengembalikan daftar yang sama persis bila tidak ada yang berubah.
export function applyCommentEvent(
  comments: Comment[],
  event: CommentEvent,
): Comment[] {
  switch (event.type) {
    case 'comment.created':
    case 'comment.updated':
      return upsertComment(comments, event.comment);
    case 'comment.deleted':
      return removeComment(comments, event.commentId);
  }
}

export function commentEventCardId(event: CommentEvent): string {
  return event.type === 'comment.deleted' ? event.cardId : event.comment.cardId;
}

// updatedAt dan createdAt bisa berbeda beberapa milidetik pada komentar baru;
// hanya selisih yang bermakna yang dianggap "diubah".
const EDITED_THRESHOLD_MS = 1000;

export function isEdited(
  comment: Pick<Comment, 'createdAt' | 'updatedAt'>,
): boolean {
  return (
    new Date(comment.updatedAt).getTime() -
      new Date(comment.createdAt).getTime() >
    EDITED_THRESHOLD_MS
  );
}