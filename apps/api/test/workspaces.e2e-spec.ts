import type {
  Board,
  InviteCodeResponse,
  InvitePreview,
  Member,
  WorkspaceDetail,
  WorkspaceSummary,
} from '@kompak/shared';
import { TestApp } from './support/test-app';
import type { TestUser } from './support/test-app';

describe('Workspaces (e2e)', () => {
  let t: TestApp;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let member2: TestUser;
  let outsider: TestUser;

  beforeAll(async () => {
    t = await TestApp.create();
    owner = await t.registerUser('owner');
    admin = await t.registerUser('admin');
    member = await t.registerUser('member');
    member2 = await t.registerUser('member2');
    outsider = await t.registerUser('outsider');
  });

  afterAll(async () => {
    await t.cleanup();
  });

  async function createWorkspace(
    user: TestUser = owner,
    name = 'Kelompok PA',
  ): Promise<WorkspaceDetail> {
    const res = await t.as(user.token).post('/workspaces', { name }).expect(201);
    return res.body as WorkspaceDetail;
  }

  async function join(user: TestUser, code: string): Promise<void> {
    await t.as(user.token).post(`/invites/${code}/join`).expect(200);
  }

  async function membersOf(
    workspaceId: string,
    user: TestUser = owner,
  ): Promise<Member[]> {
    const res = await t
      .as(user.token)
      .get(`/workspaces/${workspaceId}/members`)
      .expect(200);
    return res.body as Member[];
  }

  describe('kelompok', () => {
    it('pembuat menjadi Ketua (OWNER) dan mendapat kode undangan 8 karakter', async () => {
      const workspace = await createWorkspace();
      expect(workspace.role).toBe('OWNER');
      expect(workspace.inviteCode).toMatch(/^[A-Z2-9]{8}$/);

      const res = await t.as(owner.token).get('/workspaces').expect(200);
      const found = (res.body as WorkspaceSummary[]).find(
        (item) => item.id === workspace.id,
      );
      expect(found).toMatchObject({
        name: 'Kelompok PA',
        role: 'OWNER',
        memberCount: 1,
        boardCount: 0,
      });
    });

    it('butuh login (401); bukan anggota mendapat 404, bukan 403', async () => {
      const workspace = await createWorkspace();
      await t.anonymousGet('/workspaces').expect(401);

      const other = t.as(outsider.token);
      await other.get(`/workspaces/${workspace.id}`).expect(404);
      await other.get(`/workspaces/${workspace.id}/members`).expect(404);
      await other.get(`/workspaces/${workspace.id}/boards`).expect(404);
      await other.patch(`/workspaces/${workspace.id}`, { name: 'X' }).expect(404);
      await other.delete(`/workspaces/${workspace.id}`).expect(404);

      const list = await other.get('/workspaces').expect(200);
      expect(
        (list.body as WorkspaceSummary[]).some(
          (item) => item.id === workspace.id,
        ),
      ).toBe(false);
    });

    it('nama kosong ditolak (400)', async () => {
      await t.as(owner.token).post('/workspaces', { name: '   ' }).expect(400);
    });

    it('ganti nama: Ketua dan Pengelola boleh, Anggota 403', async () => {
      const workspace = await createWorkspace();
      await join(admin, workspace.inviteCode);
      await join(member, workspace.inviteCode);
      await t
        .as(owner.token)
        .patch(`/workspaces/${workspace.id}/members/${admin.id}`, {
          role: 'ADMIN',
        })
        .expect(200);

      const renamed = await t
        .as(admin.token)
        .patch(`/workspaces/${workspace.id}`, { name: 'Nama Baru' })
        .expect(200);
      expect((renamed.body as WorkspaceDetail).name).toBe('Nama Baru');

      await t
        .as(member.token)
        .patch(`/workspaces/${workspace.id}`, { name: 'Curang' })
        .expect(403);
    });

    it('hanya Ketua yang boleh menghapus kelompok', async () => {
      const workspace = await createWorkspace();
      await join(admin, workspace.inviteCode);
      await t
        .as(owner.token)
        .patch(`/workspaces/${workspace.id}/members/${admin.id}`, {
          role: 'ADMIN',
        })
        .expect(200);

      await t.as(admin.token).delete(`/workspaces/${workspace.id}`).expect(403);
      await t.as(owner.token).delete(`/workspaces/${workspace.id}`).expect(204);
      await t.as(owner.token).get(`/workspaces/${workspace.id}`).expect(404);
    });
  });

  describe('undangan', () => {
    it('pratinjau publik menampilkan nama kelompok; kode huruf kecil tetap berlaku', async () => {
      const workspace = await createWorkspace(owner, 'Kelompok Pratinjau');

      const res = await t.anonymousGet(`/invites/${workspace.inviteCode}`).expect(200);
      expect(res.body as InvitePreview).toEqual({
        workspaceName: 'Kelompok Pratinjau',
        memberCount: 1,
      });

      await t
        .anonymousGet(`/invites/${workspace.inviteCode.toLowerCase()}`)
        .expect(200);
      await t.anonymousGet('/invites/ZZZZZZZZ').expect(404);
    });

    it('bergabung menjadikan Anggota, dan mengulang tidak menggandakan keanggotaan', async () => {
      const workspace = await createWorkspace();

      const res = await t
        .as(member.token)
        .post(`/invites/${workspace.inviteCode}/join`)
        .expect(200);
      expect(res.body).toEqual({ workspaceId: workspace.id });
      await join(member, workspace.inviteCode);

      const members = await membersOf(workspace.id);
      expect(members).toHaveLength(2);
      expect(members.find((m) => m.userId === member.id)?.role).toBe('MEMBER');

      const preview = await t.anonymousGet(`/invites/${workspace.inviteCode}`);
      expect((preview.body as InvitePreview).memberCount).toBe(2);
    });

    it('bergabung butuh login, dan kode tidak dikenal 404', async () => {
      const workspace = await createWorkspace();
      await t.anonymousPost(`/invites/${workspace.inviteCode}/join`).expect(401);
      await t.as(member.token).post('/invites/ZZZZZZZZ/join').expect(404);
    });

    it('ganti kode: Anggota 403, Ketua berhasil dan kode lama tidak berlaku lagi', async () => {
      const workspace = await createWorkspace();
      await join(member, workspace.inviteCode);

      await t
        .as(member.token)
        .post(`/workspaces/${workspace.id}/invite/regenerate`)
        .expect(403);

      const res = await t
        .as(owner.token)
        .post(`/workspaces/${workspace.id}/invite/regenerate`)
        .expect(200);
      const { inviteCode } = res.body as InviteCodeResponse;
      expect(inviteCode).not.toBe(workspace.inviteCode);

      await t.anonymousGet(`/invites/${workspace.inviteCode}`).expect(404);
      await t.anonymousGet(`/invites/${inviteCode}`).expect(200);
    });
  });

  describe('anggota', () => {
    it('daftar anggota: Ketua di urutan pertama dan tanpa email', async () => {
      const workspace = await createWorkspace();
      await join(member, workspace.inviteCode);

      const members = await membersOf(workspace.id, member);
      expect(members[0]).toMatchObject({ userId: owner.id, role: 'OWNER' });
      expect(members[1]).toMatchObject({ userId: member.id, role: 'MEMBER' });
      expect(members[0]).not.toHaveProperty('email');
    });

    it('hanya Ketua yang mengubah peran, dan peran Ketua tidak bisa diubah', async () => {
      const workspace = await createWorkspace();
      await join(admin, workspace.inviteCode);
      await join(member, workspace.inviteCode);
      const path = (userId: string) =>
        `/workspaces/${workspace.id}/members/${userId}`;

      await t.as(owner.token).patch(path(admin.id), { role: 'ADMIN' }).expect(200);
      await t.as(admin.token).patch(path(member.id), { role: 'ADMIN' }).expect(403);
      await t.as(member.token).patch(path(member.id), { role: 'ADMIN' }).expect(403);

      await t.as(owner.token).patch(path(owner.id), { role: 'MEMBER' }).expect(400);
      await t.as(owner.token).patch(path(member.id), { role: 'OWNER' }).expect(400);
      await t.as(owner.token).patch(path(outsider.id), { role: 'ADMIN' }).expect(404);
    });

    it('aturan mengeluarkan anggota dan keluar sendiri', async () => {
      const workspace = await createWorkspace();
      for (const user of [admin, member, member2]) {
        await join(user, workspace.inviteCode);
      }
      const path = (userId: string) =>
        `/workspaces/${workspace.id}/members/${userId}`;
      const promote = (userId: string) =>
        t.as(owner.token).patch(path(userId), { role: 'ADMIN' }).expect(200);
      await promote(admin.id);

      // Anggota tidak bisa mengeluarkan anggota lain.
      await t.as(member2.token).delete(path(member.id)).expect(403);
      // Pengelola bisa mengeluarkan Anggota biasa.
      await t.as(admin.token).delete(path(member.id)).expect(204);
      await t.as(member.token).get(`/workspaces/${workspace.id}`).expect(404);

      // Pengelola tidak bisa mengeluarkan Pengelola lain maupun Ketua.
      await promote(member2.id);
      await t.as(admin.token).delete(path(member2.id)).expect(403);
      await t.as(admin.token).delete(path(owner.id)).expect(403);

      // Ketua bisa mengeluarkan Pengelola, tetapi tidak bisa keluar sendiri.
      await t.as(owner.token).delete(path(member2.id)).expect(204);
      await t.as(owner.token).delete(path(owner.id)).expect(403);

      // Anggota boleh keluar sendiri.
      await join(member, workspace.inviteCode);
      await t.as(member.token).delete(path(member.id)).expect(204);
      await t.as(member.token).get(`/workspaces/${workspace.id}`).expect(404);
    });
  });

  describe('proyek', () => {
    it('Ketua dan Pengelola mengelola proyek, Anggota hanya melihat', async () => {
      const workspace = await createWorkspace();
      await join(admin, workspace.inviteCode);
      await join(member, workspace.inviteCode);
      await t
        .as(owner.token)
        .patch(`/workspaces/${workspace.id}/members/${admin.id}`, {
          role: 'ADMIN',
        })
        .expect(200);

      const created = await t
        .as(owner.token)
        .post(`/workspaces/${workspace.id}/boards`, { name: 'Tugas Akhir' })
        .expect(201);
      const board = created.body as Board;
      expect(board).toMatchObject({
        workspaceId: workspace.id,
        name: 'Tugas Akhir',
      });

      await t
        .as(member.token)
        .post(`/workspaces/${workspace.id}/boards`, { name: 'Curang' })
        .expect(403);
      await t
        .as(member.token)
        .patch(`/boards/${board.id}`, { name: 'Curang' })
        .expect(403);
      await t.as(member.token).delete(`/boards/${board.id}`).expect(403);

      const list = await t
        .as(member.token)
        .get(`/workspaces/${workspace.id}/boards`)
        .expect(200);
      expect((list.body as Board[]).map((item) => item.id)).toEqual([board.id]);
      await t.as(member.token).get(`/boards/${board.id}`).expect(200);

      const renamed = await t
        .as(admin.token)
        .patch(`/boards/${board.id}`, { name: 'Laporan' })
        .expect(200);
      expect((renamed.body as Board).name).toBe('Laporan');

      await t.as(admin.token).delete(`/boards/${board.id}`).expect(204);
      await t.as(member.token).get(`/boards/${board.id}`).expect(404);
    });

    it('proyek tidak bisa diakses lewat ID oleh orang di luar kelompok', async () => {
      const mine = await createWorkspace(owner, 'Punyaku');
      const created = await t
        .as(owner.token)
        .post(`/workspaces/${mine.id}/boards`, { name: 'Rahasia' })
        .expect(201);
      const board = created.body as Board;

      const other = t.as(outsider.token);
      await other.get(`/boards/${board.id}`).expect(404);
      await other.patch(`/boards/${board.id}`, { name: 'X' }).expect(404);
      await other.delete(`/boards/${board.id}`).expect(404);

      // Anggota kelompok lain tidak bisa membuat proyek di kelompokku.
      await other
        .post(`/workspaces/${mine.id}/boards`, { name: 'X' })
        .expect(404);
    });

    it('nama proyek kosong ditolak (400), dan menghapus kelompok ikut menghapus proyeknya', async () => {
      const workspace = await createWorkspace();
      await t
        .as(owner.token)
        .post(`/workspaces/${workspace.id}/boards`, { name: '' })
        .expect(400);
      await t
        .as(owner.token)
        .post(`/workspaces/${workspace.id}/boards`, { name: 'Satu' })
        .expect(201);

      await t.as(owner.token).delete(`/workspaces/${workspace.id}`).expect(204);
      expect(
        await t.prisma.board.count({ where: { workspaceId: workspace.id } }),
      ).toBe(0);
    });
  });
});