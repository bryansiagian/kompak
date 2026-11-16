import type { Comment } from '@kompak/shared';

export function toComment(row: {
  id: string;
  cardId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string };
}): Comment {
  return {
    id: row.id,
    cardId: row.cardId,
    authorId: row.authorId,
    authorName: row.author.name,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}