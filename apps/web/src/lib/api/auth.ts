import { authResponseSchema } from '@kompak/shared';
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@kompak/shared';
import { apiPostNoContent, apiRequest, refreshSession } from './client';
import { setAccessToken } from './token-store';

async function startSession(
  path: string,
  body: LoginInput | RegisterInput,
): Promise<AuthUser> {
  const response = await apiRequest(path, {
    method: 'POST',
    body,
    schema: authResponseSchema,
    refreshOn401: false,
  });
  setAccessToken(response.accessToken);
  return response.user;
}

export function requestRegistrationCode(email: string): Promise<void> {
  return apiPostNoContent('/auth/register/request-code', { email });
}

export function register(input: RegisterInput): Promise<AuthUser> {
  return startSession('/auth/register', input);
}

export function login(input: LoginInput): Promise<AuthUser> {
  return startSession('/auth/login', input);
}

export function forgotPassword(email: string): Promise<void> {
  return apiPostNoContent('/auth/forgot-password', { email });
}

export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return apiPostNoContent('/auth/reset-password', input);
}

export async function logout(): Promise<void> {
  try {
    await apiPostNoContent('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function restoreSession(): Promise<AuthUser | null> {
  const session = await refreshSession();
  return session?.user ?? null;
}