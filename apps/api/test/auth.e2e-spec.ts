import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AuthResponse } from '@kompak/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  const runId = `e2e-${Date.now()}`;
  const email = `${runId}-a@example.com`;
  const password = 'rahasia123';

  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: runId } } });
    await app.close();
  });

  it('register membuat user, menormalkan email, dan menyimpan hash argon2', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), name: 'Bryan', password })
      .expect(201);

    const body = res.body as AuthResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.email).toBe(email);
    expect(body.user).not.toHaveProperty('passwordHash');

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
      .post('/api/v1/auth/register')
      .send({ email, name: 'Bryan', password })
      .expect(409);
  });

  it('register dengan input tidak valid ditolak (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'bukan-email', name: '', password: 'pendek' })
      .expect(400);
  });

  it('login berhasil dengan kredensial benar (email tidak peka huruf besar)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email.toUpperCase(), password })
      .expect(200);

    const body = res.body as AuthResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.email).toBe(email);
  });

  it('login dengan password salah ditolak (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'salah-total' })
      .expect(401);
  });

  it('login dengan email tidak terdaftar ditolak (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `${runId}-tidak-ada@example.com`, password })
      .expect(401);
  });
});