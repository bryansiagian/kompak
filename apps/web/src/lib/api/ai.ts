import { aiSubtasksSchema, aiSummarySchema } from '@kompak/shared';
import { apiRequest } from './client';

export function generateSubtasks(cardId: string) {
  return apiRequest(`/cards/${encodeURIComponent(cardId)}/ai/subtasks`, {
    method: 'POST',
    schema: aiSubtasksSchema,
  });
}

export function summarizeDiscussion(cardId: string) {
  return apiRequest(`/cards/${encodeURIComponent(cardId)}/ai/summary`, {
    method: 'POST',
    schema: aiSummarySchema,
  });
}
