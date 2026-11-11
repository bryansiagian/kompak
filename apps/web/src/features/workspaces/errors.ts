import { ApiError } from '@/lib/api/api-error';

export type WorkspaceErrorKey =
  | 'notFound'
  | 'forbidden'
  | 'tooManyRequests'
  | 'network'
  | 'generic';

export function workspaceErrorKey(error: unknown): WorkspaceErrorKey {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'notFound';
    if (error.status === 403) return 'forbidden';
    if (error.status === 429) return 'tooManyRequests';
    return 'generic';
  }
  // fetch() melempar TypeError saat jaringan atau server tidak terjangkau.
  if (error instanceof TypeError) return 'network';
  return 'generic';
}