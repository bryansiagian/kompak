import type { Socket } from 'socket.io-client';
import type {
  Activity,
  Board,
  BoardDetail,
  Card,
  Label,
  WorkspaceDetail,
} from '@kompak/shared';
import { connectSocket, joinBoard, nextEvent } from './support/socket-helpers';
import { TestApp } from './support/test-app';
import type { TestUser } from './support/test-app';

describe('Labels (e2e)', () => {
  let t: TestApp;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    t = await TestApp.create({ listen: true });
    [owner, admin, member, outsider] = await Promise.all([
      t.registerUser('owner'),
      t.registerUser('admin'),
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
    listIds: string[];
  }

  // owner (Ketua), admin (Pengelola), member (Anggota).
  async function createFixture(): Promise<Fixture> {
    const created = await t
      .as(owner.token)
      .post('/workspaces', { name: 'Kelompok Label' })
      .expect(201);
    const workspace = created.body as WorkspaceDetail;
    for (const user of [admin, member]) {
      await t
        .as(user.token)
        .post(`/invites/${workspace.inviteCode}/join`)
        .expect(200);
    }
    await t
      .as(owner.token)
      .patch(`/workspaces/${workspace.id}/members/${admin.id}`, {
        role: 'ADMIN',
      })
      .expect(200);

    const board = await createBoard(workspace.id, 'Utama');
    const detail = await boardDetail(board.id);
    return {
      workspaceId: workspace.id,
      boardId: board.id,
      listIds: detail.lists.map((list) => list.id),
    };
  }

  async function createBoard(workspaceId: string, name: string): Promise<Board> {
    const res = await t
      .as(owner.token)
      .post(`/workspaces/${workspaceId}/boards`, { name })
      .expect(201);
    return res.body as Board;
  }

  async function boardDetail(boardId: string): Promise<BoardDetail> {
    const res = await t.as(owner.token).get(`/boards/${boardId}`).expect(200);
    return res.body as BoardDetail;
  }

  async function createLabel(
    boardId: string,
    name: string,
    color = 'emerald',
    user: TestUser = owner,
  ): Promise<Label> {
    const res = await t
      .as(user.token)
      .post(`/boards/${boardId}/labels`, { name, color })
      .expect(201);
    return res.body as Label;
  }

  async function addCard(
    user: TestUser,
    listId: string,
    title: string,
  ): Promise<Card> {
    const res = await t
      .as(user.token)
      .post(`/lists/${listId}/cards`, { title })
      .expect(201);
    return res.body as Card;
  }

  const setLabels = (user: TestUser, cardId: string, labelIds: string[]) =>
    t.as(user.token).put(`/cards/${cardId}/labels`, { labelIds });

  describe('pengelolaan label', () => {
    it('Ketua dan Pengelola mengelola label; Anggota 403; orang luar 404', async () => {
      const { boardId } = await createFixture();

      const label = await createLabel(boardId, 'Urgent', 'rose');
      expect(label).toMatchObject({ boardId, name: 'Urgent', color: 'rose' });
      await createLabel(boardId, 'Desain', 'sky', admin);

      await t
        .as(member.token)
        .post(`/boards/${boardId}/labels`, { name: 'Curang', color: 'rose' })
        .expect(403);
      await t
        .as(outsider.token)
        .post(`/boards/${boardId}/labels`, { name: 'X', color: 'rose' })
        .expect(404);

      const patch = (user: TestUser, body: object) =>
        t.as(user.token).patch(`/labels/${label.id}`, body);
      const renamed = await patch(admin, { name: 'Penting', color: 'amber' }).expect(200);
      expect(renamed.body).toMatchObject({ id: label.id, name: 'Penting', color: 'amber' });
      await patch(member, { name: 'X' }).expect(403);
      await patch(outsider, { name: 'X' }).expect(404);

      await t.as(member.token).delete(`/labels/${label.id}`).expect(403);
      await t.as(outsider.token).delete(`/labels/${label.id}`).expect(404);
      await t.as(admin.token).delete(`/labels/${label.id}`).expect(204);
    });

    it('isian divalidasi: warna dari palet, nama 1 sampai 30 karakter, perubahan tidak boleh kosong', async () => {
      const { boardId } = await createFixture();
      const post = (body: object) =>
        t.as(owner.token).post(`/boards/${boardId}/labels`, body);

      await post({ name: 'X', color: 'pink' }).expect(400);
      await post({ name: '   ', color: 'rose' }).expect(400);
      await post({ name: 'a'.repeat(31), color: 'rose' }).expect(400);
      await post({ color: 'rose' }).expect(400);
      await post({ name: 'a'.repeat(30), color: 'rose' }).expect(201);

      const label = await createLabel(boardId, 'Ok');
      await t.as(owner.token).patch(`/labels/${label.id}`, {}).expect(400);
      await t
        .as(owner.token)
        .patch(`/labels/${label.id}`, { color: 'pink' })
        .expect(400);
    });

    it('satu proyek maksimal 30 label', async () => {
      const { boardId } = await createFixture();
      for (let index = 0; index < 30; index += 1) {
        await createLabel(boardId, `L${index}`);
      }
      const res = await t
        .as(owner.token)
        .post(`/boards/${boardId}/labels`, { name: 'Ke-31', color: 'rose' })
        .expect(400);
      expect(res.body).toMatchObject({ code: 'LABEL_LIMIT' });
    });

    it('detail papan memuat label proyek dan labelIds setiap tugas', async () => {
      const { boardId, listIds } = await createFixture();
      const urgent = await createLabel(boardId, 'Urgent', 'rose');
      const design = await createLabel(boardId, 'Desain', 'sky');
      const labeled = await addCard(owner, listIds[0], 'Berlabel');
      const plain = await addCard(owner, listIds[0], 'Polos');
      await setLabels(owner, labeled.id, [urgent.id, design.id]).expect(200);

      const detail = await boardDetail(boardId);
      expect(detail.labels.map((label) => label.name)).toEqual(['Urgent', 'Desain']);
      const cards = detail.lists[0].cards;
      expect(cards.find((card) => card.id === labeled.id)?.labelIds).toEqual(
        [urgent.id, design.id].sort(),
      );
      expect(cards.find((card) => card.id === plain.id)?.labelIds).toEqual([]);
    });
  });

  describe('memasang label ke tugas', () => {
    it('semua anggota boleh; himpunan diganti seluruhnya dan duplikat diabaikan', async () => {
      const { boardId, listIds } = await createFixture();
      const a = await createLabel(boardId, 'A');
      const b = await createLabel(boardId, 'B');
      const card = await addCard(member, listIds[0], 'Tugas');

      const first = await setLabels(member, card.id, [a.id, b.id, a.id]).expect(200);
      expect((first.body as Card).labelIds).toEqual([a.id, b.id].sort());

      const second = await setLabels(member, card.id, [b.id]).expect(200);
      expect((second.body as Card).labelIds).toEqual([b.id]);

      const cleared = await setLabels(member, card.id, []).expect(200);
      expect((cleared.body as Card).labelIds).toEqual([]);
    });

    it('label dari proyek lain atau yang tidak dikenal ditolak; batas 10 per tugas', async () => {
      const { workspaceId, boardId, listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Tugas');
      const otherBoard = await createBoard(workspaceId, 'Lain');
      const foreign = await createLabel(otherBoard.id, 'Asing');

      const foreignRes = await setLabels(owner, card.id, [foreign.id]).expect(400);
      expect(foreignRes.body).toMatchObject({ code: 'LABEL_NOT_ON_BOARD' });
      await setLabels(owner, card.id, ['tidak-ada']).expect(400);

      const mine = await createLabel(boardId, 'Milikku');
      const tooMany = Array.from({ length: 11 }, () => mine.id);
      await setLabels(owner, card.id, tooMany).expect(400);
    });

    it('orang luar tidak bisa memasang label', async () => {
      const { boardId, listIds } = await createFixture();
      const label = await createLabel(boardId, 'A');
      const card = await addCard(owner, listIds[0], 'Tugas');
      await setLabels(outsider, card.id, [label.id]).expect(404);
    });

    it('perubahan dicatat di riwayat; himpunan yang sama tidak dicatat lagi', async () => {
      const { listIds, boardId } = await createFixture();
      const urgent = await createLabel(boardId, 'Urgent');
      const design = await createLabel(boardId, 'Desain');
      const card = await addCard(member, listIds[0], 'Laporan');

      await setLabels(member, card.id, [urgent.id, design.id]).expect(200);
      await setLabels(member, card.id, [urgent.id, design.id]).expect(200);
      await setLabels(member, card.id, [urgent.id]).expect(200);

      const feed = (
        await t.as(owner.token).get(`/cards/${card.id}/activity`).expect(200)
      ).body as Activity[];
      expect(feed.map((entry) => entry.type)).toEqual([
        'card.labels_changed',
        'card.labels_changed',
        'card.created',
      ]);
      expect(feed[1]).toMatchObject({
        actorName: 'User member',
        payload: { title: 'Laporan', added: ['Urgent', 'Desain'], removed: [] },
      });
      expect(feed[0]).toMatchObject({
        payload: { added: [], removed: ['Desain'] },
      });
    });

    it('menghapus label melepasnya dari semua tugas', async () => {
      const { boardId, listIds } = await createFixture();
      const keep = await createLabel(boardId, 'Tetap');
      const doomed = await createLabel(boardId, 'Dihapus');
      const one = await addCard(owner, listIds[0], 'Satu');
      const two = await addCard(owner, listIds[1], 'Dua');
      await setLabels(owner, one.id, [keep.id, doomed.id]).expect(200);
      await setLabels(owner, two.id, [doomed.id]).expect(200);

      await t.as(owner.token).delete(`/labels/${doomed.id}`).expect(204);

      const detail = await boardDetail(boardId);
      expect(detail.labels.map((label) => label.id)).toEqual([keep.id]);
      const cards = detail.lists.flatMap((list) => list.cards);
      expect(cards.find((card) => card.id === one.id)?.labelIds).toEqual([keep.id]);
      expect(cards.find((card) => card.id === two.id)?.labelIds).toEqual([]);
    });
  });

  describe('peristiwa real-time', () => {
    it('label.created/updated/deleted dan card.updated (dengan labelIds) sampai ke penonton papan', async () => {
      const { boardId, listIds } = await createFixture();
      const socket = await connectSocket(t.port, member.token);
      sockets.push(socket);
      expect((await joinBoard(socket, boardId)).ok).toBe(true);
      const card = await addCard(owner, listIds[0], 'Tugas');

      const created = nextEvent(socket, 'label.created');
      const label = await createLabel(boardId, 'Urgent', 'rose');
      expect((await created).label).toMatchObject({ id: label.id, color: 'rose' });

      const updated = nextEvent(socket, 'label.updated');
      await t
        .as(owner.token)
        .patch(`/labels/${label.id}`, { name: 'Penting' })
        .expect(200);
      expect((await updated).label.name).toBe('Penting');

      const cardUpdated = nextEvent(
        socket,
        'card.updated',
        (event) => event.card.labelIds.length === 1,
      );
      await setLabels(member, card.id, [label.id]).expect(200);
      const event = await cardUpdated;
      expect(event.card).toMatchObject({ id: card.id, labelIds: [label.id] });
      expect(event.card.updatedAt >= card.updatedAt).toBe(true);

      const deleted = nextEvent(socket, 'label.deleted');
      await t.as(owner.token).delete(`/labels/${label.id}`).expect(204);
      expect(await deleted).toMatchObject({ labelId: label.id, boardId });
    });
  });
});