import { cardSchema, labelSchema } from '@kompak/shared';
import type { CreateLabelInput, UpdateLabelInput, SetCardLabelsInput } from '@kompak/shared';
import { apiNoContent, apiRequest } from './client';
const enc = encodeURIComponent;
export function createLabel(boardId: string, input: CreateLabelInput) {
  return apiRequest(`/boards/${enc(boardId)}/labels`, { method: 'POST', body: input, schema: labelSchema });
}
export function updateLabel(labelId: string, input: UpdateLabelInput) {
  return apiRequest(`/labels/${enc(labelId)}`, { method: 'PATCH', body: input, schema: labelSchema });
}
export function deleteLabel(labelId: string) {
  return apiNoContent(`/labels/${enc(labelId)}`, { method: 'DELETE' });
}
export function setCardLabels(cardId: string, input: SetCardLabelsInput) {
  return apiRequest(`/cards/${enc(cardId)}/labels`, { method: 'PUT', body: input, schema: cardSchema });
}