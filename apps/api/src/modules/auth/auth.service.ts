import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@kompak/shared';
import { Prisma } from '../../generated/prisma/client';
import { EmailCodePurpose } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EMAIL_CODE_TTL_MINUTES, REFRESH_TOKEN_TTL_MS } from './auth.constants';
import { EmailCodeService } from './email-code.service';

export interface AuthResult {
  auth: AuthResponse;
  refreshToken: string;
}

type UserSummary = AuthUser;

// Refresh token acak berentropi tinggi, jadi SHA-256 sudah cukup (tidak perlu argon2).
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function invalidCode(): BadRequestException {
  return new BadRequestException({
    message: 'Invalid or expired code',
    code: 'INVALID_CODE',
  });
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailCodes: EmailCodeService,
    private readonly mail: MailService,
  ) {}

  async requestRegistrationCode(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      // Respons tetap sama agar tidak membocorkan email terdaftar;
      // pemiliknya diberi tahu lewat email.
      this.deliver(() => this.mail.sendAlreadyRegisteredNotice(email));
      return;
    }

    const code = await this.emailCodes.issue(email, EmailCodePurpose.REGISTER);
    if (code) {
      await this.mail.sendRegistrationCode(email, code, EMAIL_CODE_TTL_MINUTES);
    }
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const valid = await this.emailCodes.consume(
      input.email,
      EmailCodePurpose.REGISTER,
      input.code,
    );
    if (!valid) {
      throw invalidCode();
    }
    const user = await this.createUser(input);
    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    // Tetap memverifikasi hash palsu saat user tidak ada, agar waktu respons
    // tidak membocorkan apakah email terdaftar.
    const passwordHash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await verify(passwordHash, input.password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return;
    }
    const code = await this.emailCodes.issue(
      email,
      EmailCodePurpose.RESET_PASSWORD,
    );
    if (code) {
      this.deliver(() =>
        this.mail.sendPasswordResetCode(email, code, EMAIL_CODE_TTL_MINUTES),
      );
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const valid = await this.emailCodes.consume(
      input.email,
      EmailCodePurpose.RESET_PASSWORD,
      input.code,
    );
    const user = valid
      ? await this.prisma.user.findUnique({
          where: { email: input.email },
          select: { id: true },
        })
      : null;
    if (!user) {
      throw invalidCode();
    }

    const passwordHash = await hash(input.password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Semua sesi lama dicabut; access token yang sudah terbit habis sendiri dalam 15 menit.
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async refresh(token: string | undefined): Promise<AuthResult> {
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Token yang sudah dicabut dipakai lagi: kemungkinan dicuri.
      // Cabut semua sesi aktif user ini.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const refreshToken = await this.prisma.$transaction(async (tx) => {
      // Klaim atomik: hanya satu permintaan yang boleh memakai token ini.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) {
        return null;
      }
      return this.createRefreshToken(stored.userId, tx);
    });
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { auth: await this.toResponse(stored.user), refreshToken };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  // Dipakai untuk email yang tidak boleh memengaruhi respons (mis. mencegah
  // pembedaan email terdaftar): kegagalan hanya dicatat.
  private deliver(send: () => Promise<void>): void {
    send().catch((error: unknown) => {
      this.logger.error(
        'Failed to deliver email',
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  private async createUser(input: RegisterInput): Promise<UserSummary> {
    const passwordHash = await hash(input.password);
    try {
      return await this.prisma.user.create({
        data: { email: input.email, name: input.name, passwordHash },
        select: { id: true, email: true, name: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  private async issueSession(user: UserSummary): Promise<AuthResult> {
    const refreshToken = await this.createRefreshToken(user.id);
    return { auth: await this.toResponse(user), refreshToken };
  }

  private async createRefreshToken(
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    await db.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return token;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hash('kompak-dummy-password');
    return this.dummyHash;
  }

  private async toResponse(user: UserSummary): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}