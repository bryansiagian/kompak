import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Rate limit (e2e)', () => {
  let app: INestApplication;
  let previous: string | undefined;

  beforeAll(async () => {
    previous = process.env.RATE_LIMIT_DISABLED;
    delete process.env.RATE_LIMIT_DISABLED;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (previous === undefined) {
      delete process.env.RATE_LIMIT_DISABLED;
    } else {
      process.env.RATE_LIMIT_DISABLED = previous;
    }
    await app.close();
  });

  it('membatasi percobaan login berulang (429 dengan Retry-After)', async () => {
    const server = app.getHttpServer();
    const payload = {
      email: `e2e-${Date.now()}-rl@example.com`,
      password: 'salah-total',
    };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(server)
        .post('/api/v1/auth/login')
        .send(payload)
        .expect(401);
    }

    const res = await request(server)
      .post('/api/v1/auth/login')
      .send(payload)
      .expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});