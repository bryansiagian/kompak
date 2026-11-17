import { z } from 'zod';

export const LABEL_COLORS = [
  'emerald',
  'amber',
  'sky',
  'rose',
  'violet',
  'teal',
  'orange',
  'stone',
] as const;
export const labelColorSchema = z.enum(LABEL_COLORS);
export type LabelColor = z.infer<typeof labelColorSchema>;

export const LABEL_NAME_MAX = 30;
export const MAX_LABELS_PER_BOARD = 30;
export const MAX_LABELS_PER_CARD = 10;

const labelNameSchema = z.string().trim().min(1).max(LABEL_NAME_MAX);

export const createLabelSchema = z.object({
  name: labelNameSchema,
  color: labelColorSchema,
});
export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = z
  .object({
    name: labelNameSchema.optional(),
    color: labelColorSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;

// Mengganti seluruh himpunan label sebuah tugas.
export const setCardLabelsSchema = z.object({
  labelIds: z.array(z.string().min(1)).max(MAX_LABELS_PER_CARD),
});
export type SetCardLabelsInput = z.infer<typeof setCardLabelsSchema>;

export const labelSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string(),
  color: labelColorSchema,
});
export type Label = z.infer<typeof labelSchema>;