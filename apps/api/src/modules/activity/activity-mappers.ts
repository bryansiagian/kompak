import { activitySchema } from '@kompak/shared';
import type { Activity } from '@kompak/shared';

// Baris dengan bentuk yang tidak dikenal (mis. dari versi lama) dilewati, bukan membuat daftar gagal.
export function toActivity(row: {
  id: string;
  boardId: string;
  cardId: string | null;
  actorId: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  actor: { name: string };
}): Activity | null {
  const parsed = activitySchema.safeParse({
    id: row.id,
    boardId: row.boardId,
    cardId: row.cardId,
    actorId: row.actorId,
    actorName: row.actor.name,
    createdAt: row.createdAt.toISOString(),
    type: row.type,
    payload: row.payload,
  });
  return parsed.success ? parsed.data : null;
}