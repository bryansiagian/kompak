import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { AuthResponse, LoginInput, RegisterInput } from '@kompak/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: input.email, name: input.name, passwordHash },
      });
      return await this.toResponse(user);
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

  async login(input: LoginInput): Promise<AuthResponse> {
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
    return this.toResponse(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hash('kompak-dummy-password');
    return this.dummyHash;
  }

  private async toResponse(user: {
    id: string;
    email: string;
    name: string;
  }): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}