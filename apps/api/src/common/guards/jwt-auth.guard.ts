import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header) {
    return undefined;
  }
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Soket mengautentikasi dirinya sendiri saat jabat tangan (RealtimeGateway).
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      request.user = { id: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return true;
  }
}