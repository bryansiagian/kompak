import { describe, expect, it, vi } from 'vitest';
import type { BoardEvent, PresenceUser } from '@kompak/shared';
import { backoffDelay, createRealtimeClient } from './client';
import type { BoardWatcher, ConnectionStatus, SocketLike } from './client';

vi.mock('@kompak/shared', () => ({
  ACCESS_REVOKED_EVENT: 'access.revoked',
  BOARD_EVENT_TYPES: ['card.created', 'presence.updated', 'board.deleted'],
  accessRevokedSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  boardEventSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  joinBoardAckSchema: { parse: (data: unknown) => data },
}));

type Listener = (...args: unknown[]) => void;

class FakeSocket implements SocketLike {
  connected = false;
  active = false;
  connectCalls = 0;
  disconnectCalls = 0;
  joinRequests: string[] = [];
  leaves: string[] = [];
  joinResult: (boardId: string) => Promise<unknown> = () =>
    Promise.resolve({ ok: true, users: [] });
  private readonly handlers = new Map<string, Listener[]>();

  connect(): void {
    this.connectCalls += 1;
    this.active = true;
  }

  disconnect(): void {
    this.disconnectCalls += 1;
    this.connected = false;
    this.active = false;
    this.fire('disconnect', 'io client disconnect');
  }

  on(event: string, listener: Listener): void {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), listener]);
  }

  emitJoin(boardId: string): Promise<unknown> {
    this.joinRequests.push(boardId);
    return this.joinResult(boardId);
  }

  emitLeave(boardId: string): void {
    this.leaves.push(boardId);
  }

  fire(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }

  // Simulasi sisi server.
  serverConnects(): void {
    this.connected = true;
    this.active = true;
    this.fire('connect');
  }

  serverDrops(reason = 'transport close'): void {
    this.connected = false;
    this.fire('disconnect', reason);
  }

  serverRejects(): void {
    this.connected = false;
    this.active = false;
    this.fire('connect_error', new Error('unauthorized'));
  }
}

class RecordingWatcher implements BoardWatcher {
  statuses: ConnectionStatus[] = [];
  events: BoardEvent[] = [];
  presences: PresenceUser[][] = [];
  synced = 0;
  revoked = 0;

  onEvent(event: BoardEvent): void {
    this.events.push(event);
  }
  onPresence(users: PresenceUser[]): void {
    this.presences.push(users);
  }
  onStatus(status: ConnectionStatus): void {
    this.statuses.push(status);
  }
  onSynced(): void {
    this.synced += 1;
  }
  onRevoked(): void {
    this.revoked += 1;
  }

  get status(): ConnectionStatus | undefined {
    return this.statuses.at(-1);
  }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(
  options: {
    restored?: boolean;
    delay?: (ms: number) => Promise<void>;
  } = {},
) {
  const socket = new FakeSocket();
  const refreshSession = vi.fn(() => Promise.resolve(options.restored ?? true));
  const client = createRealtimeClient({
    createSocket: () => socket,
    refreshSession,
    delay: options.delay ?? (() => Promise.resolve()),
  });
  return { socket, refreshSession, client };
}

describe('backoffDelay', () => {
  it('berlipat dua dan dibatasi 15 detik', () => {
    expect([0, 1, 2, 3].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000]);
    expect(backoffDelay(4)).toBe(15_000);
    expect(backoffDelay(20)).toBe(15_000);
  });
});

describe('createRealtimeClient', () => {
  it('menyambung, bergabung ke ruang papan, lalu memberi tahu pengamat', async () => {
    const { socket, client } = setup();
    socket.joinResult = () =>
      Promise.resolve({ ok: true, users: [{ userId: 'u1', name: 'Ani' }] });
    const watcher = new RecordingWatcher();

    client.watchBoard('b1', 'w1', watcher);
    expect(socket.connectCalls).toBe(1);
    expect(watcher.status).toBe('connecting');

    socket.serverConnects();
    await flush();

    expect(socket.joinRequests).toEqual(['b1']);
    expect(watcher.status).toBe('connected');
    expect(watcher.synced).toBe(1);
    expect(watcher.presences.at(-1)).toEqual([{ userId: 'u1', name: 'Ani' }]);
  });

  it('setelah koneksi putus dan tersambung lagi: bergabung ulang dan menyinkronkan', async () => {
    const { socket, client } = setup();
    const watcher = new RecordingWatcher();
    client.watchBoard('b1', 'w1', watcher);
    socket.serverConnects();
    await flush();

    socket.serverDrops();
    expect(watcher.status).toBe('disconnected');

    socket.serverConnects();
    await flush();
    expect(socket.joinRequests).toEqual(['b1', 'b1']);
    expect(watcher.synced).toBe(2);
    expect(watcher.status).toBe('connected');
  });

  it('meneruskan peristiwa ke pengamat papan yang tepat; presence dipisah', async () => {
    const { socket, client } = setup();
    const watcher = new RecordingWatcher();
    const other = new RecordingWatcher();
    client.watchBoard('b1', 'w1', watcher);
    client.watchBoard('b2', 'w1', other);
    socket.serverConnects();
    await flush();

    socket.fire('card.created', {
      type: 'card.created',
      boardId: 'b1',
      card: { id: 'c1' },
    });
    expect(watcher.events).toHaveLength(1);
    expect(other.events).toHaveLength(0);

    const before = watcher.presences.length;
    socket.fire('presence.updated', {
      type: 'presence.updated',
      boardId: 'b1',
      users: [{ userId: 'u2', name: 'Budi' }],
    });
    expect(watcher.events).toHaveLength(1);
    expect(watcher.presences).toHaveLength(before + 1);

    // Papan yang tidak diamati diabaikan.
    socket.fire('card.created', {
      type: 'card.created',
      boardId: 'b9',
      card: { id: 'c9' },
    });
    expect(watcher.events).toHaveLength(1);
  });

  it('ditolak server: memulihkan sesi lalu menyambung lagi', async () => {
    const { socket, client, refreshSession } = setup();
    const watcher = new RecordingWatcher();
    client.watchBoard('b1', 'w1', watcher);
    expect(socket.connectCalls).toBe(1);

    socket.serverRejects();
    await flush();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(socket.connectCalls).toBe(2);
    expect(watcher.status).toBe('disconnected');
  });

  it('sesi tidak bisa dipulihkan: pengamat diberi tahu dan tidak mencoba lagi', async () => {
    const { socket, client } = setup({ restored: false });
    const watcher = new RecordingWatcher();
    client.watchBoard('b1', 'w1', watcher);

    socket.serverRejects();
    await flush();

    expect(watcher.revoked).toBe(1);
    expect(socket.connectCalls).toBe(1);
  });

  it('server memutus koneksi: menyambung lagi secara manual', async () => {
    const { socket, client } = setup();
    client.watchBoard('b1', 'w1', new RecordingWatcher());
    socket.serverConnects();
    await flush();

    socket.serverDrops('io server disconnect');
    await flush();
    expect(socket.connectCalls).toBe(2);
  });

  it('access.revoked hanya memengaruhi papan di kelompok itu', async () => {
    const { socket, client } = setup();
    const inGroup = new RecordingWatcher();
    const elsewhere = new RecordingWatcher();
    client.watchBoard('b1', 'w1', inGroup);
    client.watchBoard('b2', 'w2', elsewhere);
    socket.serverConnects();
    await flush();

    socket.fire('access.revoked', { workspaceId: 'w1' });
    expect(inGroup.revoked).toBe(1);
    expect(elsewhere.revoked).toBe(0);
  });

  it('bergabung ditolak server (bukan anggota): pengamat diberi tahu kehilangan akses', async () => {
    const { socket, client } = setup();
    socket.joinResult = () => Promise.resolve({ ok: false, code: 'NOT_FOUND' });
    const watcher = new RecordingWatcher();
    client.watchBoard('b1', 'w1', watcher);
    socket.serverConnects();
    await flush();

    expect(watcher.revoked).toBe(1);
    expect(watcher.synced).toBe(0);
  });

  it('berhenti mengamati: keluar dari ruang, lalu memutus koneksi setelah tenggang', async () => {
    const { socket, client } = setup();
    const unwatch = client.watchBoard('b1', 'w1', new RecordingWatcher());
    socket.serverConnects();
    await flush();

    unwatch();
    expect(socket.leaves).toEqual(['b1']);
    await flush();
    expect(socket.disconnectCalls).toBe(1);
  });

  it('mengamati lagi sebelum tenggang habis membatalkan pemutusan koneksi', async () => {
    const releases: Array<() => void> = [];
    const { socket, client } = setup({
      delay: () =>
        new Promise<void>((resolve) => {
          releases.push(resolve);
        }),
    });
    const unwatch = client.watchBoard('b1', 'w1', new RecordingWatcher());
    socket.serverConnects();
    await flush();

    unwatch();
    client.watchBoard('b1', 'w1', new RecordingWatcher());
    for (const release of releases) {
      release();
    }
    await flush();

    expect(socket.disconnectCalls).toBe(0);
  });

  it('pengamat kedua pada papan yang sudah bergabung langsung mendapat presence dan sinkronisasi', async () => {
    const { socket, client } = setup();
    socket.joinResult = () =>
      Promise.resolve({ ok: true, users: [{ userId: 'u1', name: 'Ani' }] });
    client.watchBoard('b1', 'w1', new RecordingWatcher());
    socket.serverConnects();
    await flush();

    const second = new RecordingWatcher();
    client.watchBoard('b1', 'w1', second);
    expect(second.synced).toBe(1);
    expect(second.presences.at(-1)).toEqual([{ userId: 'u1', name: 'Ani' }]);
    expect(socket.joinRequests).toEqual(['b1']);
  });
});