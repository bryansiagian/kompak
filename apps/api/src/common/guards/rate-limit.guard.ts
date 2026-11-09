import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const RATE_LIMIT_KEY = 'rateLimit';
const MAX_BUCKETS = 10_000;

export const RateLimit = (
  options: RateLimitOptions,
): MethodDecorator & ClassDecorator => SetMetadata(RATE_LIMIT_KEY, options);

interface Bucket {
  count: number;
  resetAt: number;
}

// Penyimpanan di memori: cukup untuk satu instance. Jika API dijalankan di
// beberapa instance, pindahkan hitungan ke penyimpanan bersama (mis. Redis).
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.RATE_LIMIT_DISABLED === 'true') {
      return true;
    }
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const now = Date.now();
    this.prune(now);

    const key = `${request.ip ?? 'unknown'}:${context.getClass().name}.${context.getHandler().name}`;
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      http.getResponse<Response>().setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private prune(now: number): void {
    if (this.buckets.size < MAX_BUCKETS) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}