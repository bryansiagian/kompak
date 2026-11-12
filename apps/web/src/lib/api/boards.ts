import { boardDetailSchema, cardSchema, listSchema } from '@kompak/shared';
import type {
  CreateCardInput,
  CreateListInput,
  MoveCardInput,
  MoveListInput,
  UpdateCardInput,
  UpdateListInput,
} from '@kompak/shared';
import { apiNoContent, apiRequest } from './client';

const enc = encodeURIComponent;

export function getBoard(boardId: string) {
  return apiRequest(`/boards/${enc(boardId)}`, { schema: boardDetailSchema });
}

export function createList(boardId: string, input: CreateListInput) {
  return apiRequest(`/boards/${enc(boardId)}/lists`, {
    method: 'POST',
    body: input,
    schema: listSchema,
  });
}

export function renameList(listId: string, input: UpdateListInput) {
  return apiRequest(`/lists/${enc(listId)}`, {
    method: 'PATCH',
    body: input,
    schema: listSchema,
  });
}

export function deleteList(listId: string) {
  return apiNoContent(`/lists/${enc(listId)}`, { method: 'DELETE' });
}

export function moveList(listId: string, input: MoveListInput) {
  return apiRequest(`/lists/${enc(listId)}/move`, {
    method: 'PATCH',
    body: input,
    schema: listSchema,
  });
}

export function createCard(listId: string, input: CreateCardInput) {
  return apiRequest(`/lists/${enc(listId)}/cards`, {
    method: 'POST',
    body: input,
    schema: cardSchema,
  });
}

export function updateCard(cardId: string, input: UpdateCardInput) {
  return apiRequest(`/cards/${enc(cardId)}`, {
    method: 'PATCH',
    body: input,
    schema: cardSchema,
  });
}

export function deleteCard(cardId: string) {
  return apiNoContent(`/cards/${enc(cardId)}`, { method: 'DELETE' });
}

export function moveCard(cardId: string, input: MoveCardInput) {
  return apiRequest(`/cards/${enc(cardId)}/move`, {
    method: 'PATCH',
    body: input,
    schema: cardSchema,
  });
}