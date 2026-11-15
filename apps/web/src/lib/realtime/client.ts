import {
  ACCESS_REVOKED_EVENT,
  BOARD_EVENT_TYPES,
  accessRevokedSchema,
  boardEventSchema,
  joinBoardAckSchema,
} from '@kompak/shared';
import type { BoardEvent, JoinBoardAck, PresenceUser } from '@kompak/shared';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected';

// Bagian Socket.IO yang kita butuhkan, supaya klien ini bisa diuji dengan soket palsu.
export interface SocketLike {
  readonly connected: boolean;
  readonly active: boolean;
  connect(): void;
  disconnect(): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  emitJoin(boardId: string): Promise<unknown>;
  emitLeave(boardId: string): void;
}

export interface BoardWatcher {
  onEvent(event: BoardEvent): void;
  onPresence(users: PresenceUser[]): void;
  onStatus(status: ConnectionStatus): void;
  // Berhasil bergabung (atau bergabung ulang): saatnya menyelaraskan data dengan server.
  onSynced(): void;
  // Akses ke papan hilang (bukan anggota lagi, atau sesi tidak bisa dipulihkan).
  onRevoked(): void;
}

export interface RealtimeDeps {
  createSocket: () => SocketLike;
  // true bila sesi berhasil dipulihkan, false bila sudah tidak masuk;
  // melempar galat bila jaringan bermasalah.
  refreshSession: () => Promise<boolean>;
  delay: (ms: number) => Promise<void>;
}

export interface RealtimeClient {
  watchBoard(
    boardId: string,
    workspaceId: string,
    watcher: BoardWatcher,
  ): () => void;
}

export const IDLE_DISCONNECT_MS = 1000;
export const JOIN_RETRY_MS = 2000;
export const MAX_BACKOFF_MS = 15_000;

export function backoffDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
}

interface BoardEntry {
  workspaceId: string;
  watchers: Set<BoardWatcher>;
  joined: boolean;
  presence: PresenceUser[];
}

export function createRealtimeClient(deps: RealtimeDeps): RealtimeClient {
  const boards = new Map<string, BoardEntry>();
  let socket: SocketLike | null = null;
  let status: ConnectionStatus = 'idle';
  let attempt = 0;
  let recovering = false;
  let idleToken = 0;

  function setStatus(next: ConnectionStatus): void {
    if (next === status) {
      return;
    }
    status = next;
    for (const entry of boards.values()) {
      for (const watcher of entry.watchers) {
        watcher.onStatus(next);
      }
    }
  }

  function notifyRevoked(entry: BoardEntry): void {
    entry.joined = false;
    for (const watcher of entry.watchers) {
      watcher.onRevoked();
    }
  }

  async function join(boardId: string): Promise<void> {
    const current = socket;
    if (!current) {
      return;
    }

    let ack: JoinBoardAck;
    try {
      ack = joinBoardAckSchema.parse(await current.emitJoin(boardId));
    } catch {
      // Batas waktu atau koneksi putus saat bergabung: coba lagi bila masih tersambung.
      void retryJoin(boardId);
      return;
    }

    const entry = boards.get(boardId);
    if (!entry) {
      // Ditinggalkan selagi menunggu jawaban.
      current.emitLeave(boardId);
      return;
    }
    if (!ack.ok) {
      notifyRevoked(entry);
      return;
    }

    entry.joined = true;
    entry.presence = ack.users;
    for (const watcher of entry.watchers) {
      watcher.onPresence(ack.users);
      watcher.onSynced();
    }
  }

  async function retryJoin(boardId: string): Promise<void> {
    await deps.delay(JOIN_RETRY_MS);
    const entry = boards.get(boardId);
    if (entry && !entry.joined && socket?.connected) {
      await join(boardId);
    }
  }

  // Dipanggil saat server menolak jabat tangan (mis. token kedaluwarsa) atau
  // memutus koneksi: Socket.IO tidak menyambung ulang sendiri pada kasus itu.
  async function recover(): Promise<void> {
    if (recovering) {
      return;
    }
    recovering = true;
    try {
      let restored = true;
      try {
        restored = await deps.refreshSession();
      } catch {
        // Jaringan bermasalah: sambungkan lagi setelah jeda.
        restored = true;
      }
      if (!restored) {
        for (const entry of boards.values()) {
          notifyRevoked(entry);
        }
        return;
      }

      await deps.delay(backoffDelay(attempt));
      attempt += 1;
      if (boards.size > 0 && socket && !socket.connected) {
        socket.connect();
      }
    } finally {
      recovering = false;
    }
  }

  function handleEvent(payload: unknown): void {
    const parsed = boardEventSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    const event = parsed.data;
    const entry = boards.get(event.boardId);
    if (!entry) {
      return;
    }

    if (event.type === 'presence.updated') {
      entry.presence = event.users;
      for (const watcher of entry.watchers) {
        watcher.onPresence(event.users);
      }
      return;
    }
    for (const watcher of entry.watchers) {
      watcher.onEvent(event);
    }
  }

  function wire(target: SocketLike): void {
    target.on('connect', () => {
      attempt = 0;
      setStatus('connected');
      for (const boardId of boards.keys()) {
        void join(boardId);
      }
    });

    target.on('disconnect', (reason) => {
      for (const entry of boards.values()) {
        entry.joined = false;
      }
      if (boards.size === 0) {
        setStatus('idle');
        return;
      }
      setStatus('disconnected');
      if (reason === 'io server disconnect') {
        void recover();
      }
    });

    target.on('connect_error', () => {
      if (boards.size === 0) {
        return;
      }
      setStatus('disconnected');
      if (!target.active) {
        void recover();
      }
    });

    target.on(ACCESS_REVOKED_EVENT, (payload) => {
      const parsed = accessRevokedSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      for (const entry of boards.values()) {
        if (entry.workspaceId === parsed.data.workspaceId) {
          notifyRevoked(entry);
        }
      }
    });

    for (const type of BOARD_EVENT_TYPES) {
      target.on(type, handleEvent);
    }
  }

  function getSocket(): SocketLike {
    if (!socket) {
      socket = deps.createSocket();
      wire(socket);
    }
    return socket;
  }

  // Tenggang sebelum memutus koneksi: berpindah papan atau efek yang dijalankan
  // dua kali di mode pengembangan tidak perlu memutus lalu menyambung lagi.
  async function scheduleIdleDisconnect(): Promise<void> {
    idleToken += 1;
    const token = idleToken;
    await deps.delay(IDLE_DISCONNECT_MS);
    if (token !== idleToken || boards.size > 0) {
      return;
    }
    socket?.disconnect();
    setStatus('idle');
  }

  function unwatch(boardId: string, watcher: BoardWatcher): void {
    const entry = boards.get(boardId);
    if (!entry) {
      return;
    }
    entry.watchers.delete(watcher);
    if (entry.watchers.size > 0) {
      return;
    }

    boards.delete(boardId);
    if (socket?.connected && entry.joined) {
      socket.emitLeave(boardId);
    }
    if (boards.size === 0) {
      void scheduleIdleDisconnect();
    }
  }

  return {
    watchBoard(boardId, workspaceId, watcher) {
      idleToken += 1; // membatalkan pemutusan koneksi yang tertunda

      let entry = boards.get(boardId);
      if (!entry) {
        entry = { workspaceId, watchers: new Set(), joined: false, presence: [] };
        boards.set(boardId, entry);
      }
      entry.watchers.add(watcher);
      watcher.onStatus(status);

      const current = getSocket();
      if (current.connected) {
        if (entry.joined) {
          watcher.onPresence(entry.presence);
          watcher.onSynced();
        } else if (entry.watchers.size === 1) {
          void join(boardId);
        }
      } else if (status === 'idle') {
        setStatus('connecting');
        current.connect();
      }

      return () => unwatch(boardId, watcher);
    },
  };
}