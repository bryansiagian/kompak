import type { Board, BoardDetail, Card, WorkspaceDetail } from '@kompak/shared';
import { TestApp } from './support/test-app';

describe('AI endpoints (e2e)', () => {
  let t: TestApp;
  let token: string;
  let outsiderToken: string;
  let cardId: string;
  const oldKey = process.env.AI_API_KEY;
  const oldModel = process.env.AI_MODEL;

  beforeAll(async () => {
    // No network calls in CI. Check authorization and graceful configuration errors.
    process.env.AI_API_KEY = '';
    process.env.AI_MODEL = '';
    t = await TestApp.create();
    const user = await t.registerUser('ai-owner');
    token = user.token;
    outsiderToken = (await t.registerUser('ai-outsider')).token;
    const workspace = (await t.as(token).post('/workspaces', { name: 'Kelompok AI' }).expect(201)).body as WorkspaceDetail;
    const board = (await t.as(token).post(`/workspaces/${workspace.id}/boards`, { name: 'Proyek AI' }).expect(201)).body as Board;
    const detail = (await t.as(token).get(`/boards/${board.id}`).expect(200)).body as BoardDetail;
    const card = (await t.as(token).post(`/lists/${detail.lists[0].id}/cards`, { title: 'Kerjakan laporan' }).expect(201)).body as Card;
    cardId = card.id;
  });

  afterAll(async () => {
    await t?.cleanup();
    if (oldKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = oldModel;
  });

  it('rejects unauthenticated and nonmember callers', async () => {
    await t.anonymousPost(`/cards/${cardId}/ai/subtasks`).expect(401);
    await t.as(outsiderToken).post(`/cards/${cardId}/ai/subtasks`).expect(404);
    await t.as(outsiderToken).post(`/cards/${cardId}/ai/summary`).expect(404);
  });

  it('fails gracefully when AI is not configured', async () => {
    const res = await t.as(token).post(`/cards/${cardId}/ai/subtasks`).expect(503);
    expect(res.body).toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  });

  it('does not generate a summary without any comments', async () => {
    const res = await t.as(token).post(`/cards/${cardId}/ai/summary`).expect(400);
    expect(res.body).toMatchObject({ code: 'AI_NO_COMMENTS' });
  });
});
