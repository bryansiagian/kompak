import { z } from 'zod';

// AI only proposes content. The user explicitly accepts a suggestion before any write.
export const AI_SUBTASK_MAX = 8;
export const aiSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400),
});
export const aiSubtasksSchema = z.object({
  subtasks: z.array(aiSubtaskSchema).min(1).max(AI_SUBTASK_MAX),
});
export type AiSubtask = z.infer<typeof aiSubtaskSchema>;
export type AiSubtasks = z.infer<typeof aiSubtasksSchema>;

export const aiSummarySchema = z.object({
  summary: z.string().trim().min(1).max(1500),
  keyPoints: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  decisions: z.array(z.string().trim().min(1).max(300)).max(5),
  actionItems: z.array(z.string().trim().min(1).max(300)).max(5),
});
export type AiSummary = z.infer<typeof aiSummarySchema>;
