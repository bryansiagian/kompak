import { z } from 'zod';
import { boardSchema } from './workspace';

export const CARD_TITLE_MAX = 200;
export const CARD_DESCRIPTION_MAX = 10_000;

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Tanggal kalender saja (YYYY-MM-DD), tanpa jam, agar tidak ada masalah zona waktu.
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate, { message: 'Invalid calendar date' });

const listNameSchema = z.string().trim().min(1).max(100);
const cardTitleSchema = z.string().trim().min(1).max(CARD_TITLE_MAX);

export const createListSchema = z.object({ name: listNameSchema });
export type CreateListInput = z.infer<typeof createListSchema>;

export const updateListSchema = z.object({ name: listNameSchema });
export type UpdateListInput = z.infer<typeof updateListSchema>;

// beforeListId: kolom yang harus berada tepat setelah kolom ini; null = paling kanan.
export const moveListSchema = z.object({ beforeListId: z.string().nullable() });
export type MoveListInput = z.infer<typeof moveListSchema>;

export const createCardSchema = z.object({ title: cardTitleSchema });
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = z
  .object({
    title: cardTitleSchema.optional(),
    description: z.string().max(CARD_DESCRIPTION_MAX).optional(),
    assigneeId: z.string().nullable().optional(),
    dueDate: isoDateSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateCardInput = z.infer<typeof updateCardSchema>;

// beforeCardId: tugas yang harus berada tepat setelah tugas ini di kolom tujuan; null = paling bawah.
export const moveCardSchema = z.object({
  listId: z.string(),
  beforeCardId: z.string().nullable(),
});
export type MoveCardInput = z.infer<typeof moveCardSchema>;

export const listSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string(),
  position: z.number(),
});
export type List = z.infer<typeof listSchema>;

export const cardSchema = z.object({
  id: z.string(),
  listId: z.string(),
  boardId: z.string(),
  title: z.string(),
  description: z.string(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
  position: z.number(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Card = z.infer<typeof cardSchema>;

export const listWithCardsSchema = listSchema.extend({
  cards: z.array(cardSchema),
});
export type ListWithCards = z.infer<typeof listWithCardsSchema>;

export const boardDetailSchema = boardSchema.extend({
  lists: z.array(listWithCardsSchema),
});
export type BoardDetail = z.infer<typeof boardDetailSchema>;