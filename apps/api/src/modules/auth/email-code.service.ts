import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailCodePurpose } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_MS,
  EMAIL_CODE_TTL_MS,
} from './auth.constants';

@Injectable()
export class EmailCodeService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('EMAIL_CODE_SECRET');
  }

  // Mengembalikan kode baru, atau null bila kode sebelumnya masih dalam masa
  // tunggu kirim ulang. Hanya ada satu kode aktif per (email, tujuan).
  async issue(
    email: string,
    purpose: EmailCodePurpose,
  ): Promise<string | null> {
    const key = { email_purpose: { email, purpose } };
    const now = new Date();

    const existing = await this.prisma.emailCode.findUnique({ where: key });
    if (
      existing &&
      now.getTime() - existing.issuedAt.getTime() <
        EMAIL_CODE_RESEND_COOLDOWN_MS
    ) {
      return null;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const data = {
      codeHash: this.hash(email, purpose, code),
      attempts: 0,
      expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
      issuedAt: now,
    };
    await this.prisma.emailCode.upsert({
      where: key,
      create: { email, purpose, ...data },
      update: data,
    });
    return code;
  }

  // Kode benar dipakai sekali: barisnya dihapus. Tebakan salah menambah
  // hitungan; setelah batasnya tercapai kode harus diminta ulang.
  async consume(
    email: string,
    purpose: EmailCodePurpose,
    code: string,
  ): Promise<boolean> {
    const record = await this.prisma.emailCode.findUnique({
      where: { email_purpose: { email, purpose } },
    });
    if (
      !record ||
      record.expiresAt <= new Date() ||
      record.attempts >= EMAIL_CODE_MAX_ATTEMPTS
    ) {
      return false;
    }

    if (!this.matches(record.codeHash, this.hash(email, purpose, code))) {
      await this.prisma.emailCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    // deleteMany: hanya satu permintaan yang boleh berhasil memakai kode ini.
    const removed = await this.prisma.emailCode.deleteMany({
      where: { id: record.id },
    });
    return removed.count === 1;
  }

  private hash(
    email: string,
    purpose: EmailCodePurpose,
    code: string,
  ): string {
    return createHmac('sha256', this.secret)
      .update(`${purpose}:${email}:${code}`)
      .digest('hex');
  }

  private matches(expectedHex: string, actualHex: string): boolean {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(actualHex, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}