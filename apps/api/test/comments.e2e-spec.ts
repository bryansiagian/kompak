import type { Socket } from 'socket.io-client';
import type {
  Activity,
  Board,
  BoardDetail,
  Card,
  Comment,
  WorkspaceDetail,
} from '@kompak/shared';
import { connectSocket, joinBoard, nextEvent } from './support/socket-helpers';
import { TestApp } from './support/test-app';
import type { TestUser } from './support/test-app';

describe('Comments and activity (e2e)', () => {
  let t: TestApp;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let member2: TestUser;
  let outsider: TestUser;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    t = await TestApp.create({ listen: true });
    [owner, admin, member, member2, outsider] = await Promise.all([
      t.registerUser('owner'),
      t.registerUser('admin'),
      t.registerUser('member'),
      t.registerUser('member2'),
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
    boardId: string;
    listIds: string[];
  }

  // owner (Ketua), admin (Pengelola), member dan member2 (Anggota).
  async function createFixture(): Promise<Fixture> {
    const created = await t
      .as(owner.token)
      .post('/workspaces', { name: 'Kelompok Komentar' })
      .expect(201);
    const workspace = created.body as WorkspaceDetail;
    for (const user of [admin, member, member2]) {
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

    const boardRes = await t
      .as(owner.token)
      .post(`/workspaces/${workspace.id}/boards`, { name: 'Utama' })
      .expect(201);
    const board = boardRes.body as Board;
    const detail = (await t.as(owner.token).get(`/boards/${board.id}`).expect(200))
      .body as BoardDetail;
    return { boardId: board.id, listIds: detail.lists.map((list) => list.id) };
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

  async function addComment(
    user: TestUser,
    cardId: string,
    body: string,
  ): Promise<Comment> {
    const res = await t
      .as(user.token)
      .post(`/cards/${cardId}/comments`, { body })
      .expect(201);
    return res.body as Comment;
  }

  async function boardFeed(boardId: string, query = ''): Promise<Activity[]> {
    const res = await t
      .as(owner.token)
      .get(`/boards/${boardId}/activity${query}`)
      .expect(200);
    return res.body as Activity[];
  }

  describe('komentar', () => {
    it('anggota berkomentar dan daftar berurutan; orang luar tidak bisa mengakses', async () => {
      const { listIds } = await createFixture();
      const card = await addCard(member, listIds[0], 'Laporan');

      await addComment(member, card.id, '  Halo semua  ');
      await addComment(owner, card.id, 'Siap');

      const list = await t.as(member2.token).get(`/cards/${card.id}/comments`).expect(200);
      const comments = list.body as Comment[];
      expect(comments.map((c) => c.body)).toEqual(['Halo semua', 'Siap']);
      expect(comments[0]).toMatchObject({
        authorId: member.id,
        authorName: 'User member',
        cardId: card.id,
      });

      const other = t.as(outsider.token);
      await other.get(`/cards/${card.id}/comments`).expect(404);
      await other.post(`/cards/${card.id}/comments`, { body: 'X' }).expect(404);
    });

    it('isi komentar divalidasi', async () => {
      const { listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Tugas');
      const post = (body: unknown) =>
        t.as(owner.token).post(`/cards/${card.id}/comments`, { body } as object);

      await post('   ').expect(400);
      await post('a'.repeat(2001)).expect(400);
      await post('a'.repeat(2000)).expect(201);
    });

    it('hanya penulis yang boleh mengedit, termasuk terhadap Ketua dan Pengelola', async () => {
      const { listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Tugas');
      const comment = await addComment(member, card.id, 'Awal');
      const path = `/comments/${comment.id}`;

      const edited = await t.as(member.token).patch(path, { body: 'Diubah' }).expect(200);
      expect(edited.body).toMatchObject({ id: comment.id, body: 'Diubah' });
      expect(
        (edited.body as Comment).updatedAt >= comment.updatedAt,
      ).toBe(true);

      await t.as(owner.token).patch(path, { body: 'Curang' }).expect(403);
      await t.as(admin.token).patch(path, { body: 'Curang' }).expect(403);
      await t.as(member2.token).patch(path, { body: 'Curang' }).expect(403);
      await t.as(outsider.token).patch(path, { body: 'X' }).expect(404);
      await t.as(member.token).patch(path, { body: '' }).expect(400);
    });

    it('menghapus: penulis, Pengelola, atau Ketua; Anggota lain tidak', async () => {
      const { listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Tugas');
      const byOwner = await addComment(owner, card.id, 'Dari Ketua');
      const byMember = await addComment(member, card.id, 'Dari anggota');
      const byMember2 = await addComment(member2, card.id, 'Dari anggota 2');

      await t.as(member.token).delete(`/comments/${byOwner.id}`).expect(403);
      await t.as(member.token).delete(`/comments/${byMember2.id}`).expect(403);
      await t.as(outsider.token).delete(`/comments/${byMember.id}`).expect(404);

      await t.as(member.token).delete(`/comments/${byMember.id}`).expect(204);
      await t.as(admin.token).delete(`/comments/${byMember2.id}`).expect(204);
      await t.as(admin.token).delete(`/comments/${byOwner.id}`).expect(204);

      const list = await t.as(owner.token).get(`/cards/${card.id}/comments`).expect(200);
      expect(list.body).toEqual([]);
    });

    it('menyiarkan comment.created, comment.updated, dan comment.deleted ke penonton papan', async () => {
      const { boardId, listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Tugas');
      const socket = await connectSocket(t.port, member2.token);
      sockets.push(socket);
      expect((await joinBoard(socket, boardId)).ok).toBe(true);

      const created = nextEvent(socket, 'comment.created');
      const comment = await addComment(member, card.id, 'Baru');
      expect((await created).comment).toMatchObject({
        id: comment.id,
        body: 'Baru',
        authorName: 'User member',
      });

      const updated = nextEvent(socket, 'comment.updated');
      await t.as(member.token).patch(`/comments/${comment.id}`, { body: 'Diubah' }).expect(200);
      expect((await updated).comment.body).toBe('Diubah');

      const deleted = nextEvent(socket, 'comment.deleted');
      await t.as(member.token).delete(`/comments/${comment.id}`).expect(204);
      expect(await deleted).toMatchObject({
        commentId: comment.id,
        cardId: card.id,
        boardId,
      });
    });
  });

  describe('riwayat aktivitas', () => {
    it('mencatat tiap jenis perubahan, berurutan dari yang terbaru', async () => {
      const { boardId, listIds } = await createFixture();
      const [todo, doing] = listIds;
      const asMember = t.as(member.token);
      const asOwner = t.as(owner.token);

      const report = await addCard(member, todo, 'Laporan');
      await asMember.patch(`/cards/${report.id}`, { title: 'Laporan Akhir' }).expect(200);
      // Tidak ada yang berubah: tidak dicatat.
      await asMember.patch(`/cards/${report.id}`, { title: 'Laporan Akhir' }).expect(200);
      await asMember.patch(`/cards/${report.id}`, { description: 'Isi laporan' }).expect(200);
      await asMember.patch(`/cards/${report.id}`, { assigneeId: member2.id }).expect(200);
      await asMember.patch(`/cards/${report.id}`, { dueDate: '2026-12-31' }).expect(200);
      await asMember
        .patch(`/cards/${report.id}/move`, { listId: doing, beforeCardId: null })
        .expect(200);
      await addComment(member, report.id, 'a'.repeat(100));

      const slide = await addCard(owner, doing, 'Slide');
      // Mengurutkan ulang di kolom yang sama: tidak dicatat.
      await asOwner
        .patch(`/cards/${report.id}/move`, { listId: doing, beforeCardId: slide.id })
        .expect(200);

      await asOwner.patch(`/lists/${todo}`, { name: 'Antrean' }).expect(200);
      const review = (await asOwner.post(`/boards/${boardId}/lists`, { name: 'Review' }).expect(201))
        .body as { id: string };
      await asOwner.delete(`/lists/${review.id}`).expect(204);
      await asOwner.delete(`/cards/${slide.id}`).expect(204);

      const oldestFirst = [
        'card.created',
        'card.renamed',
        'card.described',
        'card.assigned',
        'card.due_changed',
        'card.moved',
        'comment.added',
        'card.created',
        'list.renamed',
        'list.created',
        'list.deleted',
        'card.deleted',
      ];
      const feed = await boardFeed(boardId);
      expect(feed.map((entry) => entry.type)).toEqual([...oldestFirst].reverse());

      const byType = (type: Activity['type']) =>
        feed.find((entry) => entry.type === type);
      expect(byType('card.renamed')).toMatchObject({
        actorName: 'User member',
        cardId: report.id,
        payload: { from: 'Laporan', to: 'Laporan Akhir' },
      });
      expect(byType('card.assigned')).toMatchObject({
        payload: { title: 'Laporan Akhir', assigneeName: 'User member2' },
      });
      expect(byType('card.due_changed')).toMatchObject({
        payload: { dueDate: '2026-12-31' },
      });
      expect(byType('card.moved')).toMatchObject({
        payload: {
          fromListName: 'Belum dikerjakan',
          toListName: 'Sedang dikerjakan',
        },
      });
      expect(byType('comment.added')).toMatchObject({
        payload: { excerpt: `${'a'.repeat(80)}…` },
      });
      expect(byType('list.renamed')).toMatchObject({
        cardId: null,
        payload: { from: 'Belum dikerjakan', to: 'Antrean' },
      });
      // Tugas yang sudah dihapus tetap ada di riwayat proyek.
      expect(byType('card.deleted')).toMatchObject({
        actorName: 'User owner',
        payload: { title: 'Slide' },
      });
    });

    it('riwayat per tugas hanya memuat tugas itu', async () => {
      const { listIds } = await createFixture();
      const first = await addCard(member, listIds[0], 'Satu');
      const second = await addCard(member, listIds[0], 'Dua');
      await t.as(member.token).patch(`/cards/${first.id}`, { title: 'Satu Baru' }).expect(200);
      await addComment(member, second.id, 'Halo');

      const res = await t.as(owner.token).get(`/cards/${first.id}/activity`).expect(200);
      const feed = res.body as Activity[];
      expect(feed.map((entry) => entry.type)).toEqual(['card.renamed', 'card.created']);
      expect(feed.every((entry) => entry.cardId === first.id)).toBe(true);
    });

    it('halaman: limit dan before, tanpa tumpang tindih; parameter salah ditolak', async () => {
      const { boardId, listIds } = await createFixture();
      for (const title of ['A', 'B', 'C', 'D', 'E']) {
        await addCard(owner, listIds[0], title);
      }

      const page1 = await boardFeed(boardId, '?limit=2');
      expect(page1.map((entry) => (entry.payload as { title: string }).title)).toEqual(['E', 'D']);

      const page2 = await boardFeed(
        boardId,
        `?limit=2&before=${encodeURIComponent(page1[1].createdAt)}`,
      );
      expect(page2.map((entry) => (entry.payload as { title: string }).title)).toEqual(['C', 'B']);

      const as = t.as(owner.token);
      await as.get(`/boards/${boardId}/activity?limit=0`).expect(400);
      await as.get(`/boards/${boardId}/activity?limit=101`).expect(400);
      await as.get(`/boards/${boardId}/activity?before=bukan-tanggal`).expect(400);
    });

    it('orang luar tidak bisa membaca riwayat proyek maupun tugas', async () => {
      const { boardId, listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Rahasia');

      const other = t.as(outsider.token);
      await other.get(`/boards/${boardId}/activity`).expect(404);
      await other.get(`/cards/${card.id}/activity`).expect(404);
    });

    it('menyiarkan activity.created ke penonton papan', async () => {
      const { boardId, listIds } = await createFixture();
      const socket = await connectSocket(t.port, member2.token);
      sockets.push(socket);
      expect((await joinBoard(socket, boardId)).ok).toBe(true);

      const created = nextEvent(socket, 'activity.created');
      await addCard(owner, listIds[0], 'Baru');
      expect((await created).activity).toMatchObject({
        type: 'card.created',
        actorName: 'User owner',
        payload: { title: 'Baru', listName: 'Belum dikerjakan' },
      });
    });
  });
});