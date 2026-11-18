import { AiProvider } from './ai.provider';

describe('AiProvider', () => {
  const previousKey = process.env.AI_API_KEY;
  const previousModel = process.env.AI_MODEL;
  const previousUrl = process.env.AI_BASE_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = previousModel;
    if (previousUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = previousUrl;
    global.fetch = originalFetch;
  });

  it('fails gracefully when no credentials are configured', () => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    expect(() => new AiProvider().assertConfigured()).toThrow();
  });

  it('returns structured JSON from a compatible provider', async () => {
    process.env.AI_API_KEY = 'test-only';
    process.env.AI_MODEL = 'fake-model';
    process.env.AI_BASE_URL = 'https://example.com/v1';
    let sent: RequestInit | undefined;
    global.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
      sent = options;
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"subtasks":[{"title":"Buat kerangka","description":"Awal"}]}' } }],
      }), { status: 200 });
    }) as typeof fetch;
    const result = await new AiProvider().json('Return JSON', { title: 'Tugas' });
    expect(result).toEqual({ subtasks: [{ title: 'Buat kerangka', description: 'Awal' }] });
    expect(String(sent?.body)).toContain('fake-model');
    expect(sent?.headers).toMatchObject({ Authorization: 'Bearer test-only' });
  });

  it('does not leak provider response on upstream failure', async () => {
    process.env.AI_API_KEY = 'test-only';
    process.env.AI_MODEL = 'fake-model';
    process.env.AI_BASE_URL = 'https://example.com/v1';
    global.fetch = (async () => new Response('secret provider error', { status: 500 })) as typeof fetch;
    await expect(new AiProvider().json('Return JSON', {})).rejects.toThrow('Layanan AI');
  });
});
