import { io } from 'socket.io-client';
import { BOARD_JOIN_EVENT, BOARD_LEAVE_EVENT } from '@kompak/shared';
import { getAccessToken } from '@/lib/api/token-store';
import type { SocketLike } from './client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
const JOIN_TIMEOUT_MS = 5000;

export function createBrowserSocket(): SocketLike {
  const socket = io(WS_URL, {
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
    // Dievaluasi di setiap percobaan sambung, jadi token yang sudah diperbarui ikut terkirim.
    auth: (callback) => callback({ token: getAccessToken() ?? '' }),
  });

  return {
    get connected() {
      return socket.connected;
    },
    get active() {
      return socket.active;
    },
    connect: () => {
      socket.connect();
    },
    disconnect: () => {
      socket.disconnect();
    },
    on: (event, listener) => {
      socket.on(event, listener);
    },
    emitJoin: (boardId) =>
      socket
        .timeout(JOIN_TIMEOUT_MS)
        .emitWithAck(BOARD_JOIN_EVENT, { boardId }) as Promise<unknown>,
    emitLeave: (boardId) => {
      socket.emit(BOARD_LEAVE_EVENT, { boardId });
    },
  };
}