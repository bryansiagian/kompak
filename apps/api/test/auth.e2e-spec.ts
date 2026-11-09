import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AuthResponse, AuthUser } from '@kompak/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const REFRESH_COOKIE = 'kompak_refresh';
const AUTH_PATH = '/api/v1/auth';

function setCookieFrom(res: { headers: Record<string, unknown> }): string {
  const header = res.headers['set-cookie'];
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  const found = cookies.find((cookie) =>
    cookie.startsWith(`${REFRESH_COOKIE}=`),
  );
  if (!found) {
    throw new Error('Refresh cookie was not set');
  }
  return found;
}

// "kompak_refresh=abc; Path=...; HttpOnly" -> "kompak_refresh=abc"
function cookiePair(setCookie: string): string {
  return setCookie.split(';')[0];
}

describe('Auth (e2e)', () => {
  const runId = `e2e-${Date.now()}`;
  const email = `${runId}-a@example.com`;
  const password = 'rahasia123';

  let app: INestApplication;
  let prisma: PrismaService;

  async function login(): Promise<{ body: AuthResponse; cookie: string }> {
    const res = await request(app.getHttpServer())
      .post(`${AUTH_PATH}/login`)
      .send({ email, password })
      .expect(200);
    return {
      body: res.body as AuthResponse,
      cookie: cookiePair(setCookieFrom(res)),
    };
  }

  beforeAll(async () => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env.RATE_LIMIT_DISABLED;
    await prisma.user.deleteMany({ where: { email: { startsWith: runId } } });
    await app.close();
  });

  it('register membuat user, menormalkan email, dan menyimpan hash argon2', async () => {
    const res = await request(app.getHttpServer())
      .post(`${AUTH_PATH}/register`)
      .send({ email: email.toUpperCase(), name: 'Bryan', password })
      .expect(201);

    const body = res.body as AuthResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.email).toBe(email);
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('refreshToken');

    const setCookie = setCookieFrom(res);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain(`Path=${AUTH_PATH}`);

    const payload = JSON.parse(
      Buffer.from(body.accessToken.split('.')[1], 'base64url').toString(),
    ) as { sub: string };
    expect(payload.sub).toBe(body.user.id);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(password);
  });

  it('register dengan email yang sama ditolak (409)', async () => {
    await request(app.getHttpServer())
      .post(`${AUTH_PATH}/register`)
      .send({ email, name: 'Bryan', password })
      .expect(409);
  });

  it('register dengan input tidak valid ditolak (400)', async () => {
    await request(app.getHttpServer())
      .post(`${AUTH_PATH}/register`)
      .send({ email: 'bukan-email', name: '', password: 'pendek' })
      .expect(400);
  });

  it('login berhasil dan menyetel cookie refresh (email tidak peka huruf besar)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${AUTH_PATH}/login`)
      .send({ email: email.toUpperCase(), password })
      .expect(200);

    const body = res.body as AuthResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.email).toBe(email);
    expect(setCookieFrom(res)).toContain('HttpOnly');
  });

  it('login dengan password salah ditolak (401)', async () => {
    await request(app.getHttpServer())
      .post(`${AUTH_PATH}/login`)
      .send({ email, password: 'salah-total' })
      .expect(401);
  });

  it('login dengan email tidak terdaftar ditolak (401)', async () => {
    await request(app.getHttpServer())
      .post(`${AUTH_PATH}/login`)
      .send({ email: `${runId}-tidak-ada@example.com`, password })
      .expect(401);
  });

  it('GET /health tetap publik', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

      it('GET /auth/me butuh access token yang valid', async () => {
    const server = app.getHttpServer();

    const missing = await request(server).get(`${AUTH_PATH}/me`).expect(401);
    expect((missing.body as { message: string }).message).toBe(
      'Missing access token',
    );

    // Pesan ini hanya dilempar guard, jadi membuktikan guard global aktif.
    const invalid = await request(server)
      .get(`${AUTH_PATH}/me`)
      .set('Authorization', 'Bearer token-ngawur')
      .expect(401);
    expect((invalid.body as { message: string }).message).toBe(
      'Invalid or expired access token',
    );

    const { body } = await login();
    const res = await request(server)
      .get(`${AUTH_PATH}/me`)
      .set('Authorization', `Bearer ${body.accessToken}`);

    // Dibandingkan sebagai objek agar pesan error ikut terlihat saat gagal.
    expect({ status: res.status, body: res.body }).toMatchObject({
      status: 200,
      body: { email },
    });
    expect((res.body as AuthUser).email).toBe(email);
  });

  it('refresh memutar token: cookie baru berbeda dan token lama tidak bisa dipakai', async () => {
    const server = app.getHttpServer();
    const { cookie: first } = await login();

    const res = await request(server)
      .post(`${AUTH_PATH}/refresh`)
      .set('Cookie', first)
      .expect(200);
    expect(typeof (res.body as AuthResponse).accessToken).toBe('string');
    const second = cookiePair(setCookieFrom(res));
    expect(second).not.toBe(first);

    await request(server)
      .post(`${AUTH_PATH}/refresh`)
      .set('Cookie', second)
      .expect(200);
  });

  it('memakai ulang refresh token lama mencabut semua sesi (deteksi pencurian)', async () => {
    const server = app.getHttpServer();
    const { cookie: first } = await login();

    const rotated = await request(server)
      .post(`${AUTH_PATH}/refresh`)
      .set('Cookie', first)
      .expect(200);
    const second = cookiePair(setCookieFrom(rotated));

    await request(server)
      .post(`${AUTH_PATH}/refresh`)
      .set('Cookie', first)
      .expect(401);
    await request(server)
      .post(`${AUTH_PATH}/refresh`)
      .set('Cookie', second)
      .expect(401);
  });

  it('refresh tanpa cookie ditolak (401)', async () => {
    await request(app.getHttpServer()).post(`${AUTH_PATH}/refresh`).expect(401);
  });

  it('logout mencabut refresh token dan menghapus cookie', async () => {
    const server = app.getHttpServer();
    const { cookie } = await login();

    const res = await request(server)
      .post(`${AUTH_PATH}/logout`)
      .set('Cookie', cookie)
      .expect(204);
    expect(setCookieFrom(res)).toContain(`${REFRESH_COOKIE}=;`);

    await request(server)
      .post(`${AUTH_PATH}/refresh`)
      .set('Cookie', cookie)
      .expect(401);
  });

  it('database hanya menyimpan hash refresh token, bukan token aslinya', async () => {
    const { body, cookie } = await login();
    const raw = cookie.slice(`${REFRESH_COOKIE}=`.length);

    const rows = await prisma.refreshToken.findMany({
      where: { userId: body.user.id },
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.tokenHash === raw)).toBe(false);
    expect(rows.every((row) => /^[0-9a-f]{64}$/.test(row.tokenHash))).toBe(
      true,
    );
  });
});