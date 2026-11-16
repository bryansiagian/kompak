import { z } from 'zod';

export const ACTIVITY_PAGE_DEFAULT = 30;
export const ACTIVITY_PAGE_MAX = 100;

// Isi catatan menyimpan nama saat kejadian, jadi tetap terbaca setelah nama berubah.
export const activityDetailSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('card.created'),
    payload: z.object({ title: z.string(), listName: z.string() }),
  }),
  z.object({
    type: z.literal('card.renamed'),
    payload: z.object({ from: z.string(), to: z.string() }),
  }),
  z.object({
    type: z.literal('card.described'),
    payload: z.object({ title: z.string() }),
  }),
  z.object({
    type: z.literal('card.assigned'),
    payload: z.object({
      title: z.string(),
      assigneeName: z.string().nullable(),
    }),
  }),
  z.object({
    type: z.literal('card.due_changed'),
    payload: z.object({ title: z.string(), dueDate: z.string().nullable() }),
  }),
  z.object({
    type: z.literal('card.moved'),
    payload: z.object({
      title: z.string(),
      fromListName: z.string(),
      toListName: z.string(),
    }),
  }),
  z.object({
    type: z.literal('card.deleted'),
    payload: z.object({ title: z.string() }),
  }),
  z.object({
    type: z.literal('comment.added'),
    payload: z.object({ title: z.string(), excerpt: z.string() }),
  }),
  z.object({
    type: z.literal('list.created'),
    payload: z.object({ name: z.string() }),
  }),
  z.object({
    type: z.literal('list.renamed'),
    payload: z.object({ from: z.string(), to: z.string() }),
  }),
  z.object({
    type: z.literal('list.deleted'),
    payload: z.object({ name: z.string() }),
  }),
]);
export type ActivityDetail = z.infer<typeof activityDetailSchema>;

const activityBaseSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  // null untuk kejadian pada kolom.
  cardId: z.string().nullable(),
  actorId: z.string(),
  actorName: z.string(),
  createdAt: z.string(),
});

export const activitySchema = z.intersection(
  activityBaseSchema,
  activityDetailSchema,
);
export type Activity = z.infer<typeof activitySchema>;

export const activityListSchema = z.array(activitySchema);

export const activityQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ACTIVITY_PAGE_MAX)
    .default(ACTIVITY_PAGE_DEFAULT),
  // Ambil catatan yang lebih lama dari waktu ini (untuk halaman berikutnya).
  before: z.string().datetime().optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;