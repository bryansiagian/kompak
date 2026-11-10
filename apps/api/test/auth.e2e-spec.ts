import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AuthResponse, AuthUser } from '@kompak/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/modules/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakeMailService } from './support/fake-mail.service';

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

function wrongCodeFor(code: string): string {
  return code === '000000' ? '111111' : '000000';
}

describe('Auth (e2e)', () => {
  const runId = `e2e-${Date.now()}`;
  const password = 'rahasia123';
  const email = `${runId}-main@example.com`;

  let app: INestApplication;
  let prisma: PrismaService;
  let mail: FakeMailService;
  let counter = 0;

  function newEmail(): string {
    counter += 1;
    return `${runId}-${counter}@example.com`;
  }

  async function requestRegistrationCode(address: string): Promise<string> {
    await request(app.getHttpServer())
      .post(`${AUTH_PATH}/register/request-code`)
      .send({ email: address })
      .expect(204);
    return mail.lastCode(address, 'registration');
  }

  function registerWith(
    address: string,
    code: string,
    overrides: { name?: string; password?: string } = {},
  ) {
    return request(app.getHttpServer())
      .post(`${AUTH_PATH}/register`)
      .send({ email: address, code, name: 'Bryan', password, ...overrides });
  }

  function loginAs(address: string, pass: string) {
    return request(app.getHttpServer())
      .post(`${AUTH_PATH}/login`)
      .send({ email: address, password: pass });
  }

  async function login(): Promise<{ body: AuthResponse; cookie: string }> {
    const res = await loginAs(email, password).expect(200);
    return {
      body: res.body as AuthResponse,
      cookie: cookiePair(setCookieFrom(res)),
    };
  }

  beforeAll(async () => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    mail = new FakeMailService();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const code = await requestRegistrationCode(email);
    await registerWith(email, code).expect(201);
  });

  afterAll(async () => {
    delete process.env.RATE_LIMIT_DISABLED;
    await prisma.user.deleteMany({ where: { email: { startsWith: runId } } });
    await prisma.emailCode.deleteMany({
      where: { email: { startsWith: runId } },
    });
    await app.close();
  });

  describe('registrasi dengan kode email', () => {
    it('request-code mengirim kode 6 digit dan menahan kirim ulang selama masa tunggu', async () => {
      const address = newEmail();
      const code = await requestRegistrationCode(address);
      expect(code).toMatch(/^\d{6}$/);

      await request(app.getHttpServer())
        .post(`${AUTH_PATH}/register/request-code`)
        .send({ email: address })
        .expect(204);
      expect(mail.mailsTo(address, 'registration')).toHaveLength(1);
    });

    it('register dengan kode benar membuat user, menormalkan email, dan menyimpan hash argon2', async () => {
      const address = newEmail();
      const code = await requestRegistrationCode(address);

      const res = await registerWith(address.toUpperCase(), code).expect(201);

      const body = res.body as AuthResponse;
      expect(typeof body.accessToken).toBe('string');
      expect(body.user.email).toBe(address);
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('refreshToken');

      const setCookie = setCookieFrom(res);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain(`Path=${AUTH_PATH}`);

      const payload = JSON.parse(
        Buffer.from(body.accessToken.split('.')[1], 'base64url').toString(),
      ) as { sub: string };
      expect(payload.sub).toBe(body.user.id);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: address },
      });
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      expect(stored.passwordHash).not.toContain(password);
    });

    it('register dengan kode salah ditolak (400 INVALID_CODE)', async () => {
      const address = newEmail();
      const code = await requestRegistrationCode(address);

      const res = await registerWith(address, wrongCodeFor(code)).expect(400);
      expect(res.body).toMatchObject({ code: 'INVALID_CODE' });
    });

    it('kode hanya bisa dipakai sekali', async () => {
      const address = newEmail();
      const code = await requestRegistrationCode(address);
      await registerWith(address, code).expect(201);
      await registerWith(address, code).expect(400);
    });

    it('kode hangus setelah 5 tebakan salah, walau tebakan berikutnya benar', async () => {
      const address = newEmail();
      const code = await requestRegistrationCode(address);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await registerWith(address, wrongCodeFor(code)).expect(400);
      }
      await registerWith(address, code).expect(400);
    });

    it('email yang sudah terdaftar tidak menerima kode, hanya pemberitahuan', async () => {
      await request(app.getHttpServer())
        .post(`${AUTH_PATH}/register/request-code`)
        .send({ email })
        .expect(204);

      expect(mail.mailsTo(email, 'registration')).toHaveLength(1);
      expect(mail.mailsTo(email, 'already-registered').length).toBeGreaterThan(
        0,
      );
    });

    it('input tidak valid ditolak (400)', async () => {
      await request(app.getHttpServer())
        .post(`${AUTH_PATH}/register`)
        .send({
          email: 'bukan-email',
          code: 'abc',
          name: '',
          password: 'pendek',
        })
        .expect(400);
    });
  });

  describe('login dan sesi', () => {
    it('login berhasil dan menyetel cookie refresh (email tidak peka huruf besar)', async () => {
      const res = await loginAs(email.toUpperCase(), password).expect(200);

      const body = res.body as AuthResponse;
      expect(typeof body.accessToken).toBe('string');
      expect(body.user.email).toBe(email);
      expect(setCookieFrom(res)).toContain('HttpOnly');
    });

    it('login dengan password salah ditolak (401)', async () => {
      await loginAs(email, 'salah-total').expect(401);
    });

    it('login dengan email tidak terdaftar ditolak (401)', async () => {
      await loginAs(`${runId}-tidak-ada@example.com`, password).expect(401);
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
      await request(app.getHttpServer())
        .post(`${AUTH_PATH}/refresh`)
        .expect(401);
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

  describe('lupa kata sandi', () => {
    it('forgot-password tidak membocorkan email yang tidak terdaftar', async () => {
      const address = newEmail();
      await request(app.getHttpServer())
        .post(`${AUTH_PATH}/forgot-password`)
        .send({ email: address })
        .expect(204);
      expect(mail.mailsTo(address, 'reset')).toHaveLength(0);
    });

    it('reset-password mengganti kata sandi, mencabut sesi lama, dan kode hanya sekali pakai', async () => {
      const server = app.getHttpServer();
      const address = newEmail();
      const newPassword = 'sandi-baru-123';

      const registered = await registerWith(
        address,
        await requestRegistrationCode(address),
      ).expect(201);
      const oldCookie = cookiePair(setCookieFrom(registered));

      await request(server)
        .post(`${AUTH_PATH}/forgot-password`)
        .send({ email: address })
        .expect(204);
      const code = mail.lastCode(address, 'reset');
      expect(code).toMatch(/^\d{6}$/);

      const reset = (resetCode: string) =>
        request(server)
          .post(`${AUTH_PATH}/reset-password`)
          .send({ email: address, code: resetCode, password: newPassword });

      await reset(wrongCodeFor(code)).expect(400);
      await reset(code).expect(204);
      await reset(code).expect(400);

      await loginAs(address, password).expect(401);
      await loginAs(address, newPassword).expect(200);
      await request(server)
        .post(`${AUTH_PATH}/refresh`)
        .set('Cookie', oldCookie)
        .expect(401);
    });
  });
});