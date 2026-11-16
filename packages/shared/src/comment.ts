import { z } from 'zod';

export const COMMENT_MAX_LENGTH = 2000;

const commentBodySchema = z.string().trim().min(1).max(COMMENT_MAX_LENGTH);

export const createCommentSchema = z.object({ body: commentBodySchema });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({ body: commentBodySchema });
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const commentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentListSchema = z.array(commentSchema);