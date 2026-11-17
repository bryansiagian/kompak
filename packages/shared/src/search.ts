import { z } from 'zod';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_LIMIT_DEFAULT = 20;
export const SEARCH_LIMIT_MAX = 50;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH_MIN_LENGTH).max(SEARCH_MAX_LENGTH),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SEARCH_LIMIT_MAX)
    .default(SEARCH_LIMIT_DEFAULT),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  cardId: z.string(),
  title: z.string(),
  boardId: z.string(),
  boardName: z.string(),
  listId: z.string(),
  listName: z.string(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResultListSchema = z.array(searchResultSchema);