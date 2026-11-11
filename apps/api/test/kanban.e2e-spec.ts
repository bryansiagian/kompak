import type {
  Board,
  BoardDetail,
  Card,
  List,
  WorkspaceDetail,
} from '@kompak/shared';
import { TestApp } from './support/test-app';
import type { TestUser } from './support/test-app';

const DEFAULT_NAMES = ['Belum dikerjakan', 'Sedang dikerjakan', 'Selesai'];

describe('Lists and cards (e2e)', () => {
  let t: TestApp;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let member2: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    t = await TestApp.create();
    [owner, admin, member, member2, outsider] = await Promise.all([
      t.registerUser('owner'),
      t.registerUser('admin'),
      t.registerUser('member'),
      t.registerUser('member2'),
      t.registerUser('outsider'),
    ]);
  });

  afterAll(async () => {
    await t?.cleanup();
  });

  interface Fixture {
    workspaceId: string;
    boardId: string;
    listIds: string[];
  }

  async function boardDetail(
    boardId: string,
    user: TestUser = owner,
  ): Promise<BoardDetail> {
    const res = await t.as(user.token).get(`/boards/${boardId}`).expect(200);
    return res.body as BoardDetail;
  }

  // Kelompok baru: owner (Ketua), admin (Pengelola), member dan member2 (Anggota).
  async function createFixture(): Promise<Fixture> {
    const created = await t
      .as(owner.token)
      .post('/workspaces', { name: 'Kelompok PA' })
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
      .post(`/workspaces/${workspace.id}/boards`, { name: 'Tugas Akhir' })
      .expect(201);
    const board = boardRes.body as Board;
    const detail = await boardDetail(board.id);
    return {
      workspaceId: workspace.id,
      boardId: board.id,
      listIds: detail.lists.map((list) => list.id),
    };
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

  function titlesOf(detail: BoardDetail, listId: string): string[] {
    return (
      detail.lists
        .find((list) => list.id === listId)
        ?.cards.map((card) => card.title) ?? []
    );
  }

  describe('proyek baru', () => {
    it('langsung punya tiga kolom bawaan yang berurutan', async () => {
      const { boardId } = await createFixture();
      const detail = await boardDetail(boardId);

      expect(detail.lists.map((list) => list.name)).toEqual(DEFAULT_NAMES);
      const positions = detail.lists.map((list) => list.position);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(detail.lists.every((list) => list.cards.length === 0)).toBe(true);
    });
  });

  describe('kolom', () => {
    it('Ketua dan Pengelola mengelola kolom, Anggota 403', async () => {
      const { boardId } = await createFixture();

      const created = await t
        .as(owner.token)
        .post(`/boards/${boardId}/lists`, { name: 'Review' })
        .expect(201);
      const review = created.body as List;
      expect((await boardDetail(boardId)).lists.map((l) => l.name)).toEqual([
        ...DEFAULT_NAMES,
        'Review',
      ]);

      await t
        .as(member.token)
        .post(`/boards/${boardId}/lists`, { name: 'Curang' })
        .expect(403);
      await t
        .as(admin.token)
        .patch(`/lists/${review.id}`, { name: 'Ditinjau' })
        .expect(200);
      await t
        .as(member.token)
        .patch(`/lists/${review.id}`, { name: 'X' })
        .expect(403);
      await t.as(member.token).delete(`/lists/${review.id}`).expect(403);
      await t.as(admin.token).delete(`/lists/${review.id}`).expect(204);
    });

    it('memindahkan kolom: sebelum kolom lain atau ke paling akhir', async () => {
      const { boardId, listIds } = await createFixture();
      const [a, b, c] = listIds;
      const move = (listId: string, beforeListId: string | null) =>
        t.as(owner.token).patch(`/lists/${listId}/move`, { beforeListId });
      const order = async () =>
        (await boardDetail(boardId)).lists.map((list) => list.id);

      await move(c, a).expect(200);
      expect(await order()).toEqual([c, a, b]);
      await move(c, null).expect(200);
      expect(await order()).toEqual([a, b, c]);

      const missing = await move(a, 'tidak-ada').expect(400);
      expect(missing.body).toMatchObject({ code: 'ANCHOR_NOT_FOUND' });
      await t
        .as(member.token)
        .patch(`/lists/${a}/move`, { beforeListId: null })
        .expect(403);
    });

    it('menghapus kolom menghapus tugasnya, dan menghapus proyek menghapus kolomnya', async () => {
      const { boardId, listIds } = await createFixture();
      await addCard(owner, listIds[0], 'Akan hilang');

      await t.as(owner.token).delete(`/lists/${listIds[0]}`).expect(204);
      expect(await t.prisma.card.count({ where: { boardId } })).toBe(0);
      expect(await t.prisma.list.count({ where: { boardId } })).toBe(2);

      await t.as(owner.token).delete(`/boards/${boardId}`).expect(204);
      expect(await t.prisma.list.count({ where: { boardId } })).toBe(0);
    });
  });

  describe('tugas', () => {
    it('tambah cepat: cukup judul, ditaruh di akhir kolom', async () => {
      const { boardId, listIds } = await createFixture();
      const [todo] = listIds;

      const one = await addCard(owner, todo, '  Satu  ');
      expect(one).toMatchObject({
        title: 'Satu',
        description: '',
        assigneeId: null,
        dueDate: null,
        listId: todo,
        boardId,
        createdById: owner.id,
      });
      const two = await addCard(member, todo, 'Dua');
      expect(two.position).toBeGreaterThan(one.position);
      expect(titlesOf(await boardDetail(boardId), todo)).toEqual(['Satu', 'Dua']);

      await t
        .as(outsider.token)
        .post(`/lists/${todo}/cards`, { title: 'X' })
        .expect(404);
      await t
        .as(owner.token)
        .post(`/lists/${todo}/cards`, { title: '   ' })
        .expect(400);
    });

    it('mengubah tugas: judul, deskripsi, penanggung jawab, tenggat', async () => {
      const { listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Awal');
      const patch = (body: object) =>
        t.as(member.token).patch(`/cards/${card.id}`, body);

      const updated = await patch({
        title: 'Judul baru',
        description: '## Catatan\n- satu',
        assigneeId: member2.id,
        dueDate: '2026-12-31',
      }).expect(200);
      expect(updated.body).toMatchObject({
        title: 'Judul baru',
        description: '## Catatan\n- satu',
        assigneeId: member2.id,
        dueDate: '2026-12-31',
      });

      await patch({ assigneeId: outsider.id }).expect(400);
      await patch({ dueDate: '2026-02-30' }).expect(400);
      await patch({ dueDate: 'besok' }).expect(400);
      await patch({}).expect(400);
      await patch({ title: '' }).expect(400);

      const cleared = await patch({ assigneeId: null, dueDate: null }).expect(200);
      expect(cleared.body).toMatchObject({
        title: 'Judul baru',
        assigneeId: null,
        dueDate: null,
      });

      await t
        .as(outsider.token)
        .patch(`/cards/${card.id}`, { title: 'X' })
        .expect(404);
    });

    it('memindahkan tugas dalam kolom dan antar kolom', async () => {
      const { workspaceId, boardId, listIds } = await createFixture();
      const [todo, doing] = listIds;
      const a = await addCard(owner, todo, 'A');
      const b = await addCard(owner, todo, 'B');
      const c = await addCard(owner, todo, 'C');

      const move = (
        user: TestUser,
        cardId: string,
        listId: string,
        beforeCardId: string | null,
      ) =>
        t.as(user.token).patch(`/cards/${cardId}/move`, { listId, beforeCardId });
      const snapshot = async () => {
        const detail = await boardDetail(boardId);
        return { todo: titlesOf(detail, todo), doing: titlesOf(detail, doing) };
      };

      await move(member, c.id, todo, a.id).expect(200);
      expect(await snapshot()).toEqual({ todo: ['C', 'A', 'B'], doing: [] });

      await move(member, a.id, doing, null).expect(200);
      expect(await snapshot()).toEqual({ todo: ['C', 'B'], doing: ['A'] });

      await move(owner, b.id, doing, a.id).expect(200);
      expect(await snapshot()).toEqual({ todo: ['C'], doing: ['B', 'A'] });

      // Jangkar harus berada di kolom tujuan.
      const wrongAnchor = await move(owner, c.id, todo, a.id).expect(400);
      expect(wrongAnchor.body).toMatchObject({ code: 'ANCHOR_NOT_FOUND' });

      // Kolom di proyek lain tidak boleh jadi tujuan.
      const otherRes = await t
        .as(owner.token)
        .post(`/workspaces/${workspaceId}/boards`, { name: 'Lain' })
        .expect(201);
      const otherBoard = otherRes.body as Board;
      const otherList = (await boardDetail(otherBoard.id)).lists[0].id;
      await move(owner, c.id, otherList, null).expect(404);

      await move(outsider, c.id, doing, null).expect(404);
    });

    it('menghapus tugas: pembuat, Pengelola, atau Ketua; bukan anggota lain', async () => {
      const { listIds } = await createFixture();
      const [todo] = listIds;
      const ownersCard = await addCard(owner, todo, 'Punya Ketua');
      const membersCard = await addCard(member, todo, 'Punya Anggota');
      const secondCard = await addCard(member, todo, 'Punya Anggota 2');

      await t.as(member.token).delete(`/cards/${ownersCard.id}`).expect(403);
      await t.as(member2.token).delete(`/cards/${membersCard.id}`).expect(403);
      await t.as(member.token).delete(`/cards/${membersCard.id}`).expect(204);
      await t.as(admin.token).delete(`/cards/${secondCard.id}`).expect(204);
      await t.as(owner.token).delete(`/cards/${ownersCard.id}`).expect(204);
      await t.as(owner.token).get(`/cards/${ownersCard.id}`).expect(404);
    });

    it('orang di luar kelompok tidak bisa mengakses papan, kolom, atau tugas lewat ID', async () => {
      const { boardId, listIds } = await createFixture();
      const card = await addCard(owner, listIds[0], 'Rahasia');
      const other = t.as(outsider.token);

      await other.get(`/boards/${boardId}`).expect(404);
      await other.post(`/boards/${boardId}/lists`, { name: 'X' }).expect(404);
      await other.patch(`/lists/${listIds[0]}`, { name: 'X' }).expect(404);
      await other.delete(`/lists/${listIds[0]}`).expect(404);
      await other
        .patch(`/lists/${listIds[0]}/move`, { beforeListId: null })
        .expect(404);
      await other.post(`/lists/${listIds[0]}/cards`, { title: 'X' }).expect(404);
      await other.get(`/cards/${card.id}`).expect(404);
      await other.patch(`/cards/${card.id}`, { title: 'X' }).expect(404);
      await other.delete(`/cards/${card.id}`).expect(404);
      await other
        .patch(`/cards/${card.id}/move`, { listId: listIds[1], beforeCardId: null })
        .expect(404);
    });

    it('urutan tetap benar setelah puluhan pemindahan di tempat yang sama (penomoran ulang)', async () => {
      const { boardId, listIds } = await createFixture();
      const [todo] = listIds;
      const a = await addCard(owner, todo, 'A');
      const b = await addCard(owner, todo, 'B');

      // Tiap pemindahan menaruh kartu di depan kartu pertama, sehingga posisinya
      // terus dibagi dua sampai celah habis dan kolom dinomori ulang.
      for (let step = 0; step < 40; step += 1) {
        const [mover, first] = step % 2 === 0 ? [b, a] : [a, b];
        await t
          .as(owner.token)
          .patch(`/cards/${mover.id}/move`, {
            listId: todo,
            beforeCardId: first.id,
          })
          .expect(200);
      }

      const detail = await boardDetail(boardId);
      const cards = detail.lists.find((list) => list.id === todo)?.cards ?? [];
      expect(cards.map((card) => card.title)).toEqual(['A', 'B']);
      const positions = cards.map((card) => card.position);
      // Tanpa penomoran ulang, posisi pertama sudah menyusut ke ~1e-9.
      expect(positions[0]).toBeGreaterThan(1e-6);
      expect(positions[1]).toBeGreaterThan(positions[0]);
    });
  });
});