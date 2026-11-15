import type { Socket } from 'socket.io-client';
import type {
  Board,
  BoardDetail,
  Card,
  List,
  WorkspaceDetail,
} from '@kompak/shared';
import { RealtimeService } from '../src/modules/realtime/realtime.service';
import {
  connectSocket,
  expectNoEvent,
  joinBoard,
  nextAccessRevoked,
  nextEvent,
} from './support/socket-helpers';
import { TestApp } from './support/test-app';
import type { TestUser } from './support/test-app';

describe('Real-time (e2e)', () => {
  let t: TestApp;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    t = await TestApp.create({ listen: true });
    [owner, member, outsider] = await Promise.all([
      t.registerUser('owner'),
      t.registerUser('member'),
      t.registerUser('outsider'),
    ]);
  });

  afterEach(() => {
    for (const socket of sockets) {
      socket.close();
    }
    sockets.length = 0;
  });

  afterAll(async () => {
    await t?.cleanup();
  });

  interface Fixture {
    workspaceId: string;
    boardId: string;
    otherBoardId: string;
    listIds: string[];
  }

  // Kelompok baru berisi owner dan member, dengan dua proyek.
  async function createFixture(): Promise<Fixture> {
    const created = await t
      .as(owner.token)
      .post('/workspaces', { name: 'Kelompok Real-time' })
      .expect(201);
    const workspace = created.body as WorkspaceDetail;
    await t
      .as(member.token)
      .post(`/invites/${workspace.inviteCode}/join`)
      .expect(200);

    const createBoard = async (name: string): Promise<Board> => {
      const res = await t
        .as(owner.token)
        .post(`/workspaces/${workspace.id}/boards`, { name })
        .expect(201);
      return res.body as Board;
    };
    const board = await createBoard('Utama');
    const other = await createBoard('Lain');
    const detail = (
      await t.as(owner.token).get(`/boards/${board.id}`).expect(200)
    ).body as BoardDetail;

    return {
      workspaceId: workspace.id,
      boardId: board.id,
      otherBoardId: other.id,
      listIds: detail.lists.map((list) => list.id),
    };
  }

  async function connected(user: TestUser): Promise<Socket> {
    const socket = await connectSocket(t.port, user.token);
    sockets.push(socket);
    return socket;
  }

  async function joined(user: TestUser, boardId: string): Promise<Socket> {
    const socket = await connected(user);
    const ack = await joinBoard(socket, boardId);
    expect(ack.ok).toBe(true);
    return socket;
  }

  describe('koneksi dan ruang papan', () => {
    it('koneksi tanpa token atau dengan token ngawur ditolak', async () => {
      await expect(connectSocket(t.port)).rejects.toThrow('unauthorized');
      await expect(connectSocket(t.port, 'token-ngawur')).rejects.toThrow(
        'unauthorized',
      );
    });

    it('anggota boleh bergabung; orang luar mendapat NOT_FOUND; isian salah BAD_REQUEST', async () => {
      const { boardId } = await createFixture();

      const ownerSocket = await connected(owner);
      const ack = await joinBoard(ownerSocket, boardId);
      expect(ack).toMatchObject({ ok: true });
      expect(ack.ok && ack.users.map((user) => user.userId)).toEqual([owner.id]);

      const outsiderSocket = await connected(outsider);
      expect(await joinBoard(outsiderSocket, boardId)).toEqual({
        ok: false,
        code: 'NOT_FOUND',
      });
      expect(await joinBoard(outsiderSocket, 'tidak-ada')).toEqual({
        ok: false,
        code: 'NOT_FOUND',
      });

      const badAck: unknown = await ownerSocket
        .timeout(3000)
        .emitWithAck('board.join', { salah: 1 });
      expect(badAck).toEqual({ ok: false, code: 'BAD_REQUEST' });
    });

    it('presence: pengguna unik, diperbarui saat bergabung dan keluar', async () => {
      const { boardId } = await createFixture();
      const ownerSocket = await joined(owner, boardId);

      const twoUsers = nextEvent(
        ownerSocket,
        'presence.updated',
        (event) => event.users.length === 2,
      );
      const memberSocket = await joined(member, boardId);
      expect((await twoUsers).users.map((user) => user.userId).sort()).toEqual(
        [owner.id, member.id].sort(),
      );

      // Tab kedua milik pengguna yang sama tidak menambah hitungan.
      await joined(owner, boardId);
      expect(await t.app.get(RealtimeService).presenceOf(boardId)).toHaveLength(2);

      const oneUser = nextEvent(
        ownerSocket,
        'presence.updated',
        (event) => event.users.length === 1,
      );
      memberSocket.disconnect();
      expect((await oneUser).users.map((user) => user.userId)).toEqual([owner.id]);
    });

    it('board.leave menghentikan peristiwa dan memperbarui presence', async () => {
      const { boardId, listIds } = await createFixture();
      const ownerSocket = await joined(owner, boardId);
      const memberSocket = await joined(member, boardId);

      const ack: unknown = await memberSocket
        .timeout(3000)
        .emitWithAck('board.leave', { boardId });
      expect(ack).toEqual({ ok: true });

      const silent = expectNoEvent(memberSocket, 'card.created');
      const seen = nextEvent(ownerSocket, 'card.created');
      await t
        .as(owner.token)
        .post(`/lists/${listIds[0]}/cards`, { title: 'Hanya untuk owner' })
        .expect(201);
      await seen;
      await silent;
    });
  });

  describe('peristiwa tugas', () => {
    it('dibuat, diubah, dipindah, dan dihapus muncul di penonton papan yang sama saja', async () => {
      const { boardId, otherBoardId, listIds } = await createFixture();
      const [todo, doing] = listIds;
      const ownerSocket = await joined(owner, boardId);
      const otherBoardSocket = await joined(owner, otherBoardId);
      const as = t.as(member.token);

      const created = nextEvent(ownerSocket, 'card.created');
      const notOnOtherBoard = expectNoEvent(otherBoardSocket, 'card.created');
      const card = (
        await as.post(`/lists/${todo}/cards`, { title: 'Baru' }).expect(201)
      ).body as Card;
      expect((await created).card).toMatchObject({
        id: card.id,
        title: 'Baru',
        listId: todo,
      });
      await notOnOtherBoard;

      const updated = nextEvent(ownerSocket, 'card.updated');
      await as.patch(`/cards/${card.id}`, { title: 'Diubah' }).expect(200);
      const updatedEvent = await updated;
      expect(updatedEvent.card.title).toBe('Diubah');
      expect(updatedEvent.card.updatedAt >= card.updatedAt).toBe(true);

      const moved = nextEvent(ownerSocket, 'card.moved');
      await as
        .patch(`/cards/${card.id}/move`, { listId: doing, beforeCardId: null })
        .expect(200);
      expect(await moved).toMatchObject({
        fromListId: todo,
        order: [card.id],
        card: { id: card.id, listId: doing },
      });

      const deleted = nextEvent(ownerSocket, 'card.deleted');
      await as.delete(`/cards/${card.id}`).expect(204);
      expect(await deleted).toMatchObject({
        cardId: card.id,
        listId: doing,
        boardId,
      });
    });

    it('pemindahan membawa urutan lengkap kolom tujuan', async () => {
      const { boardId, listIds } = await createFixture();
      const [todo, doing] = listIds;
      const ownerSocket = await joined(owner, boardId);
      const as = t.as(owner.token);
      const addCard = async (title: string, listId: string): Promise<Card> =>
        (await as.post(`/lists/${listId}/cards`, { title }).expect(201))
          .body as Card;

      const a = await addCard('A', todo);
      const b = await addCard('B', todo);
      const x = await addCard('X', doing);

      const moved = nextEvent(ownerSocket, 'card.moved');
      await as
        .patch(`/cards/${b.id}/move`, { listId: doing, beforeCardId: x.id })
        .expect(200);
      expect((await moved).order).toEqual([b.id, x.id]);

      const reordered = nextEvent(ownerSocket, 'card.moved');
      await as
        .patch(`/cards/${a.id}/move`, { listId: doing, beforeCardId: null })
        .expect(200);
      expect((await reordered).order).toEqual([b.id, x.id, a.id]);
    });
  });

  describe('peristiwa kolom dan proyek', () => {
    it('kolom: dibuat, diganti nama, dipindah (dengan urutan), dan dihapus', async () => {
      const { boardId, listIds } = await createFixture();
      const memberSocket = await joined(member, boardId);
      const as = t.as(owner.token);

      const created = nextEvent(memberSocket, 'list.created');
      const list = (
        await as.post(`/boards/${boardId}/lists`, { name: 'Review' }).expect(201)
      ).body as List;
      expect((await created).list).toMatchObject({ id: list.id, name: 'Review' });

      const renamed = nextEvent(memberSocket, 'list.updated');
      await as.patch(`/lists/${list.id}`, { name: 'Ditinjau' }).expect(200);
      expect((await renamed).list.name).toBe('Ditinjau');

      const moved = nextEvent(memberSocket, 'list.moved');
      await as
        .patch(`/lists/${list.id}/move`, { beforeListId: listIds[0] })
        .expect(200);
      expect((await moved).order).toEqual([list.id, ...listIds]);

      const deleted = nextEvent(memberSocket, 'list.deleted');
      await as.delete(`/lists/${list.id}`).expect(204);
      expect(await deleted).toMatchObject({ listId: list.id, boardId });
    });

    it('proyek: ganti nama menyiarkan board.updated; dihapus menyiarkan board.deleted dan mengosongkan ruang', async () => {
      const { boardId } = await createFixture();
      const memberSocket = await joined(member, boardId);
      const as = t.as(owner.token);

      const renamed = nextEvent(memberSocket, 'board.updated');
      await as.patch(`/boards/${boardId}`, { name: 'Nama Baru' }).expect(200);
      expect((await renamed).board.name).toBe('Nama Baru');

      const deleted = nextEvent(memberSocket, 'board.deleted');
      await as.delete(`/boards/${boardId}`).expect(204);
      expect((await deleted).boardId).toBe(boardId);
      expect(await t.app.get(RealtimeService).presenceOf(boardId)).toEqual([]);
    });
  });

  describe('pencabutan akses', () => {
    it('anggota yang dikeluarkan menerima access.revoked dan tidak lagi menerima peristiwa', async () => {
      const { workspaceId, boardId, listIds } = await createFixture();
      const ownerSocket = await joined(owner, boardId);
      const memberSocket = await joined(member, boardId);

      const revoked = nextAccessRevoked(memberSocket);
      const presence = nextEvent(
        ownerSocket,
        'presence.updated',
        (event) => event.users.length === 1,
      );
      await t
        .as(owner.token)
        .delete(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(204);
      expect(await revoked).toEqual({ workspaceId });
      expect((await presence).users.map((user) => user.userId)).toEqual([owner.id]);

      const silent = expectNoEvent(memberSocket, 'card.created');
      const seen = nextEvent(ownerSocket, 'card.created');
      await t
        .as(owner.token)
        .post(`/lists/${listIds[0]}/cards`, { title: 'Setelah dikeluarkan' })
        .expect(201);
      await seen;
      await silent;

      // Tidak bisa bergabung lagi karena sudah bukan anggota.
      expect(await joinBoard(memberSocket, boardId)).toEqual({
        ok: false,
        code: 'NOT_FOUND',
      });
    });

    it('anggota yang keluar sendiri juga dicabut aksesnya', async () => {
      const { workspaceId, boardId } = await createFixture();
      const memberSocket = await joined(member, boardId);

      const revoked = nextAccessRevoked(memberSocket);
      await t
        .as(member.token)
        .delete(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(204);
      expect(await revoked).toEqual({ workspaceId });
    });

    it('menghapus kelompok mencabut akses semua penonton', async () => {
      const { workspaceId, boardId } = await createFixture();
      const ownerSocket = await joined(owner, boardId);
      const memberSocket = await joined(member, boardId);

      const ownerRevoked = nextAccessRevoked(ownerSocket);
      const memberRevoked = nextAccessRevoked(memberSocket);
      await t.as(owner.token).delete(`/workspaces/${workspaceId}`).expect(204);

      expect(await ownerRevoked).toEqual({ workspaceId });
      expect(await memberRevoked).toEqual({ workspaceId });
      expect(await t.app.get(RealtimeService).presenceOf(boardId)).toEqual([]);
    });
  });
});