import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  loginSchema,
  registerSchema,
  requestCodeSchema,
  resetPasswordSchema,
} from '@kompak/shared';
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
  RequestCodeInput,
  ResetPasswordInput,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { AuthService } from './auth.service';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

const ONE_MINUTE_MS = 60_000;

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit({ limit: 5, windowMs: ONE_MINUTE_MS })
  @Post('register/request-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestRegistrationCode(
    @Body(new ZodValidationPipe(requestCodeSchema)) body: RequestCodeInput,
  ): Promise<void> {
    await this.auth.requestRegistrationCode(body.email);
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: ONE_MINUTE_MS })
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { auth, refreshToken } = await this.auth.register(body);
    setRefreshCookie(res, refreshToken);
    return auth;
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: ONE_MINUTE_MS })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { auth, refreshToken } = await this.auth.login(body);
    setRefreshCookie(res, refreshToken);
    return auth;
  }

  @Public()
  @RateLimit({ limit: 5, windowMs: ONE_MINUTE_MS })
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body(new ZodValidationPipe(requestCodeSchema)) body: RequestCodeInput,
  ): Promise<void> {
    await this.auth.requestPasswordReset(body.email);
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: ONE_MINUTE_MS })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ): Promise<void> {
    await this.auth.resetPassword(body);
  }

  @Public()
  @RateLimit({ limit: 30, windowMs: ONE_MINUTE_MS })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { auth, refreshToken } = await this.auth.refresh(
      readRefreshCookie(req),
    );
    setRefreshCookie(res, refreshToken);
    return auth;
  }

  // Publik agar logout tetap bisa dilakukan saat access token sudah kedaluwarsa.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(req));
    clearRefreshCookie(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}