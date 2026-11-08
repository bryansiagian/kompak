import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { loginSchema, registerSchema } from '@kompak/shared';
import type { AuthResponse, LoginInput, RegisterInput } from '@kompak/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<AuthResponse> {
    return this.auth.login(body);
  }
}