import { z } from 'zod';
import { cardSchema, listSchema } from './kanban';
import { boardSchema } from './workspace';

export const BOARD_JOIN_EVENT = 'board.join';
export const BOARD_LEAVE_EVENT = 'board.leave';
export const ACCESS_REVOKED_EVENT = 'access.revoked';

export const joinBoardSchema = z.object({ boardId: z.string().min(1) });
export type JoinBoardInput = z.infer<typeof joinBoardSchema>;

export const presenceUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
});
export type PresenceUser = z.infer<typeof presenceUserSchema>;

export const joinBoardAckSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), users: z.array(presenceUserSchema) }),
  z.object({
    ok: z.literal(false),
    code: z.enum(['BAD_REQUEST', 'NOT_FOUND']),
  }),
]);
export type JoinBoardAck = z.infer<typeof joinBoardAckSchema>;

export const accessRevokedSchema = z.object({ workspaceId: z.string() });
export type AccessRevoked = z.infer<typeof accessRevokedSchema>;

const idList = z.array(z.string());

export const boardEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('board.updated'),
    boardId: z.string(),
    board: boardSchema,
  }),
  z.object({ type: z.literal('board.deleted'), boardId: z.string() }),
  z.object({
    type: z.literal('list.created'),
    boardId: z.string(),
    list: listSchema,
  }),
  z.object({
    type: z.literal('list.updated'),
    boardId: z.string(),
    list: listSchema,
  }),
  z.object({
    type: z.literal('list.moved'),
    boardId: z.string(),
    list: listSchema,
    // Urutan ID kolom di papan setelah pemindahan.
    order: idList,
  }),
  z.object({
    type: z.literal('list.deleted'),
    boardId: z.string(),
    listId: z.string(),
  }),
  z.object({
    type: z.literal('card.created'),
    boardId: z.string(),
    card: cardSchema,
  }),
  z.object({
    type: z.literal('card.updated'),
    boardId: z.string(),
    card: cardSchema,
  }),
  z.object({
    type: z.literal('card.moved'),
    boardId: z.string(),
    card: cardSchema,
    fromListId: z.string(),
    // Urutan ID tugas di kolom tujuan setelah pemindahan.
    order: idList,
  }),
  z.object({
    type: z.literal('card.deleted'),
    boardId: z.string(),
    cardId: z.string(),
    listId: z.string(),
  }),
  z.object({
    type: z.literal('presence.updated'),
    boardId: z.string(),
    users: z.array(presenceUserSchema),
  }),
]);
export type BoardEvent = z.infer<typeof boardEventSchema>;
export type BoardEventType = BoardEvent['type'];

// Daftar nama peristiwa diturunkan dari skema, jadi tidak ada daftar kedua yang bisa tertinggal.
export const BOARD_EVENT_TYPES: BoardEventType[] = boardEventSchema.options.map(
  (option) => option.shape.type.value,
);