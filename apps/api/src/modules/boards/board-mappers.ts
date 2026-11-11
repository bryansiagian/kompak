import type { Card, List } from '@kompak/shared';

export function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function toList(list: {
  id: string;
  boardId: string;
  name: string;
  position: number;
}): List {
  return {
    id: list.id,
    boardId: list.boardId,
    name: list.name,
    position: list.position,
  };
}

export function toCard(card: {
  id: string;
  listId: string;
  boardId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: Date | null;
  position: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Card {
  return {
    id: card.id,
    listId: card.listId,
    boardId: card.boardId,
    title: card.title,
    description: card.description,
    assigneeId: card.assigneeId,
    dueDate: formatDate(card.dueDate),
    position: card.position,
    createdById: card.createdById,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}