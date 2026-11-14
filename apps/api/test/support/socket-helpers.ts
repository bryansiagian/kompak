import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import {
  ACCESS_REVOKED_EVENT,
  accessRevokedSchema,
  boardEventSchema,
  joinBoardAckSchema,
} from '@kompak/shared';
import type {
  AccessRevoked,
  BoardEvent,
  BoardEventType,
  JoinBoardAck,
} from '@kompak/shared';

export function connectSocket(port: number, token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

export async function joinBoard(
  socket: Socket,
  boardId: string,
): Promise<JoinBoardAck> {
  const ack: unknown = await socket
    .timeout(3000)
    .emitWithAck('board.join', { boardId });
  return joinBoardAckSchema.parse(ack);
}

type EventOf<T extends BoardEventType> = Extract<BoardEvent, { type: T }>;

// Pasang pendengar SEBELUM memicu perubahan, lalu tunggu hasilnya.
export function nextEvent<T extends BoardEventType>(
  socket: Socket,
  type: T,
  predicate: (event: EventOf<T>) => boolean = () => true,
  timeoutMs = 3000,
): Promise<EventOf<T>> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = (payload: unknown) => {
      // Bentuk payload dari server harus sesuai skema bersama.
      const event = boardEventSchema.parse(payload) as EventOf<T>;
      if (!predicate(event)) {
        return;
      }
      clearTimeout(timer);
      socket.off(type, handler);
      resolve(event);
    };
    timer = setTimeout(() => {
      socket.off(type, handler);
      reject(new Error(`Timed out waiting for ${type}`));
    }, timeoutMs);
    socket.on(type, handler);
  });
}

export function nextAccessRevoked(
  socket: Socket,
  timeoutMs = 3000,
): Promise<AccessRevoked> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(ACCESS_REVOKED_EVENT, handler);
      reject(new Error('Timed out waiting for access.revoked'));
    }, timeoutMs);
    const handler = (payload: unknown) => {
      clearTimeout(timer);
      resolve(accessRevokedSchema.parse(payload));
    };
    socket.once(ACCESS_REVOKED_EVENT, handler);
  });
}

export async function expectNoEvent(
  socket: Socket,
  type: BoardEventType,
  waitMs = 400,
): Promise<void> {
  let received = false;
  const handler = () => {
    received = true;
  };
  socket.on(type, handler);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  socket.off(type, handler);
  expect(received).toBe(false);
}