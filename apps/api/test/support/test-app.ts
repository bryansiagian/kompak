import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AuthResponse } from '@kompak/shared';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { MailService } from '../../src/modules/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakeMailService } from './fake-mail.service';

const API = '/api/v1';

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

export class TestApp {
  readonly runId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  private constructor(
    readonly app: INestApplication,
    readonly prisma: PrismaService,
    readonly mail: FakeMailService,
  ) {}

  static async create(): Promise<TestApp> {
    process.env.RATE_LIMIT_DISABLED = 'true';
    const mail = new FakeMailService();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();
    const app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    return new TestApp(app, app.get(PrismaService), mail);
  }

  async registerUser(label: string): Promise<TestUser> {
    const email = `${this.runId}-${label}@example.com`;
    const server = this.app.getHttpServer();

    await request(server)
      .post(`${API}/auth/register/request-code`)
      .send({ email })
      .expect(204);
    const code = this.mail.lastCode(email, 'registration');
    const res = await request(server)
      .post(`${API}/auth/register`)
      .send({ email, code, name: `User ${label}`, password: 'rahasia123' })
      .expect(201);

    const body = res.body as AuthResponse;
    return { id: body.user.id, email, token: body.accessToken };
  }

  // Permintaan dengan access token pengguna tertentu.
  as(token: string) {
    const server = this.app.getHttpServer();
    const header = `Bearer ${token}`;
    return {
      get: (path: string) =>
        request(server).get(`${API}${path}`).set('Authorization', header),
      post: (path: string, body: object = {}) =>
        request(server)
          .post(`${API}${path}`)
          .set('Authorization', header)
          .send(body),
      patch: (path: string, body: object = {}) =>
        request(server)
          .patch(`${API}${path}`)
          .set('Authorization', header)
          .send(body),
      delete: (path: string) =>
        request(server).delete(`${API}${path}`).set('Authorization', header),
    };
  }

  anonymousGet(path: string) {
    return request(this.app.getHttpServer()).get(`${API}${path}`);
  }

  anonymousPost(path: string) {
    return request(this.app.getHttpServer()).post(`${API}${path}`);
  }

  async cleanup(): Promise<void> {
    delete process.env.RATE_LIMIT_DISABLED;
    const prefix = { startsWith: `${this.runId}-` };
    // Kelompok milik pengguna uji dihapus dulu (anggota dan proyek ikut terhapus).
    await this.prisma.workspace.deleteMany({
      where: { owner: { email: prefix } },
    });
    await this.prisma.user.deleteMany({ where: { email: prefix } });
    await this.prisma.emailCode.deleteMany({ where: { email: prefix } });
    await this.app.close();
  }
}