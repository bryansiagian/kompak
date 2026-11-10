import { ApiError } from '@/lib/api/api-error';

export type AuthErrorKey =
  | 'invalidCode'
  | 'mailFailed'
  | 'emailTaken'
  | 'invalidCredentials'
  | 'tooManyRequests'
  | 'network'
  | 'generic';

export function authErrorKey(error: unknown): AuthErrorKey {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CODE') return 'invalidCode';
    if (error.status === 409) return 'emailTaken';
    if (error.status === 401) return 'invalidCredentials';
    if (error.status === 429) return 'tooManyRequests';
    if (error.status === 503) return 'mailFailed';
    return 'generic';
  }
  // fetch() melempar TypeError saat jaringan atau server tidak terjangkau.
  if (error instanceof TypeError) return 'network';
  return 'generic';
}