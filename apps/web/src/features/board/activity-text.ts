import type { Activity } from '@kompak/shared';
import { formatDueDate } from './due-date';

export type ActivityMessageKey =
  | 'cardCreated'
  | 'cardRenamed'
  | 'cardDescribed'
  | 'cardAssigned'
  | 'cardUnassigned'
  | 'cardDueChanged'
  | 'cardDueCleared'
  | 'cardMoved'
  | 'cardDeleted'
  | 'commentAdded'
  | 'listCreated'
  | 'listRenamed'
  | 'listDeleted';

export interface ActivityMessage {
  key: ActivityMessageKey;
  values: Record<string, string>;
}

// Kunci pesan dan nilainya; kalimatnya sendiri ada di messages/id.json (board.activity.items).
export function describeActivity(activity: Activity): ActivityMessage {
  const actor = activity.actorName;

  switch (activity.type) {
    case 'card.created':
      return {
        key: 'cardCreated',
        values: {
          actor,
          title: activity.payload.title,
          listName: activity.payload.listName,
        },
      };
    case 'card.renamed':
      return {
        key: 'cardRenamed',
        values: { actor, from: activity.payload.from, to: activity.payload.to },
      };
    case 'card.described':
      return {
        key: 'cardDescribed',
        values: { actor, title: activity.payload.title },
      };
    case 'card.assigned':
      return activity.payload.assigneeName === null
        ? {
            key: 'cardUnassigned',
            values: { actor, title: activity.payload.title },
          }
        : {
            key: 'cardAssigned',
            values: {
              actor,
              title: activity.payload.title,
              assignee: activity.payload.assigneeName,
            },
          };
    case 'card.due_changed':
      return activity.payload.dueDate === null
        ? {
            key: 'cardDueCleared',
            values: { actor, title: activity.payload.title },
          }
        : {
            key: 'cardDueChanged',
            values: {
              actor,
              title: activity.payload.title,
              date: formatDueDate(activity.payload.dueDate),
            },
          };
    case 'card.moved':
      return {
        key: 'cardMoved',
        values: {
          actor,
          title: activity.payload.title,
          from: activity.payload.fromListName,
          to: activity.payload.toListName,
        },
      };
    case 'card.deleted':
      return {
        key: 'cardDeleted',
        values: { actor, title: activity.payload.title },
      };
    case 'comment.added':
      return {
        key: 'commentAdded',
        values: {
          actor,
          title: activity.payload.title,
          excerpt: activity.payload.excerpt,
        },
      };
    case 'list.created':
      return { key: 'listCreated', values: { actor, name: activity.payload.name } };
    case 'list.renamed':
      return {
        key: 'listRenamed',
        values: { actor, from: activity.payload.from, to: activity.payload.to },
      };
    case 'list.deleted':
      return { key: 'listDeleted', values: { actor, name: activity.payload.name } };
  }
}