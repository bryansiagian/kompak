import type {
  Board,
  BoardDetail,
  Card,
  SearchResult,
  WorkspaceDetail,
} from '@kompak/shared';
import { TestApp } from './support/test-app';
import type { TestUser } from './support/test-app';

describe('Workspace search (e2e)', () => {
  let t: TestApp;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    t = await TestApp.create();
    [owner, member, outsider] = await Promise.all([
      t.registerUser('owner'),
      t.registerUser('member'),
      t.registerUser('outsider'),
    ]);
  });

  afterAll(async () => {
    await t?.cleanup();
  });

  interface Fixture {
    workspaceId: string;
    boardId: string;
    todo: string;
  }

  async function createWorkspaceWithBoard(
    user: TestUser,
    boardName: string,
  ): Promise<Fixture & { inviteCode: string }> {
    const created = await t
      .as(user.token)
      .post('/workspaces', { name: 'Kelompok Pencarian' })
      .expect(201);
    const workspace = created.body as WorkspaceDetail;
    const boardRes = await t
      .as(user.token)
      .post(`/workspaces/${workspace.id}/boards`, { name: boardName })
      .expect(201);
    const board = boardRes.body as Board;
    const detail = (await t.as(user.token).get(`/boards/${board.id}`).expect(200))
      .body as BoardDetail;
    return {
      workspaceId: workspace.id,
      boardId: board.id,
      todo: detail.lists[0].id,
      inviteCode: workspace.inviteCode,
    };
  }

  async function addCard(
    user: TestUser,
    listId: string,
    title: string,
    description?: string,
  ): Promise<Card> {
    const res = await t
      .as(user.token)
      .post(`/lists/${listId}/cards`, { title })
      .expect(201);
    const card = res.body as Card;
    if (description) {
      await t
        .as(user.token)
        .patch(`/cards/${card.id}`, { description })
        .expect(200);
    }
    return card;
  }

  const search = (user: TestUser, workspaceId: string, query: string) =>
    t.as(user.token).get(`/workspaces/${workspaceId}/search${query}`);

  it('mencari di judul dan deskripsi tanpa membedakan huruf besar kecil, hanya di kelompok itu', async () => {
    const mine = await createWorkspaceWithBoard(owner, 'Proyek Akhir');
    await addCard(owner, mine.todo, 'Laporan Akhir', 'bab satu');
    await addCard(owner, mine.todo, 'Slide presentasi', 'ringkasan LAPORAN');
    await addCard(owner, mine.todo, 'Catatan rapat');

    const other = await createWorkspaceWithBoard(outsider, 'Proyek Lain');
    await addCard(outsider, other.todo, 'Laporan rahasia');

    const res = await search(owner, mine.workspaceId, '?q=laporan').expect(200);
    const results = res.body as SearchResult[];
    expect(results.map((result) => result.title).sort()).toEqual([
      'Laporan Akhir',
      'Slide presentasi',
    ]);
    expect(results[0]).toMatchObject({
      boardId: mine.boardId,
      boardName: 'Proyek Akhir',
      listId: mine.todo,
      listName: 'Belum dikerjakan',
      assigneeId: null,
      dueDate: null,
    });
    expect(results.some((result) => result.title === 'Laporan rahasia')).toBe(false);
  });

  it('yang terakhir diubah tampil lebih dulu', async () => {
    const fixture = await createWorkspaceWithBoard(owner, 'Urutan');
    const older = await addCard(owner, fixture.todo, 'Tugas lama kopi');
    await addCard(owner, fixture.todo, 'Tugas baru kopi');
    await t
      .as(owner.token)
      .patch(`/cards/${older.id}`, { description: 'diubah belakangan' })
      .expect(200);

    const res = await search(owner, fixture.workspaceId, '?q=kopi').expect(200);
    expect((res.body as SearchResult[]).map((result) => result.title)).toEqual([
      'Tugas lama kopi',
      'Tugas baru kopi',
    ]);
  });

  it('anggota boleh mencari; orang luar 404; tanpa login 401', async () => {
    const fixture = await createWorkspaceWithBoard(owner, 'Akses');
    await addCard(owner, fixture.todo, 'Dokumen kontrak');
    await t
      .as(member.token)
      .post(`/invites/${fixture.inviteCode}/join`)
      .expect(200);

    const found = await search(member, fixture.workspaceId, '?q=kontrak').expect(200);
    expect(found.body).toHaveLength(1);

    await search(outsider, fixture.workspaceId, '?q=kontrak').expect(404);
    await t.anonymousGet(`/workspaces/${fixture.workspaceId}/search?q=kontrak`).expect(401);
  });

  it('kata kunci dan batas divalidasi; limit membatasi jumlah hasil', async () => {
    const fixture = await createWorkspaceWithBoard(owner, 'Validasi');
    for (const title of ['Tugas satu', 'Tugas dua', 'Tugas tiga']) {
      await addCard(owner, fixture.todo, title);
    }

    await search(owner, fixture.workspaceId, '?q=t').expect(400);
    await search(owner, fixture.workspaceId, '').expect(400);
    await search(owner, fixture.workspaceId, `?q=${'a'.repeat(101)}`).expect(400);
    await search(owner, fixture.workspaceId, '?q=tugas&limit=0').expect(400);
    await search(owner, fixture.workspaceId, '?q=tugas&limit=51').expect(400);

    const limited = await search(owner, fixture.workspaceId, '?q=tugas&limit=2').expect(200);
    expect(limited.body).toHaveLength(2);
    const all = await search(owner, fixture.workspaceId, '?q=tugas').expect(200);
    expect(all.body).toHaveLength(3);
  });

  it('tugas yang sudah dihapus tidak muncul lagi', async () => {
    const fixture = await createWorkspaceWithBoard(owner, 'Hapus');
    const card = await addCard(owner, fixture.todo, 'Sementara ada');
    await search(owner, fixture.workspaceId, '?q=sementara').expect(200);

    await t.as(owner.token).delete(`/cards/${card.id}`).expect(204);
    const res = await search(owner, fixture.workspaceId, '?q=sementara').expect(200);
    expect(res.body).toEqual([]);
  });
});