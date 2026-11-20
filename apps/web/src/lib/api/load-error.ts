import { ApiError } from './api-error';

export function classifyLoadError(error: unknown) {
  if (error instanceof ApiError) {
    const { status } = error;
    if (status === 400) return 'badRequest';
    if (status === 404) return 'notFound';
    if (status === 401 || status === 403) return 'forbidden';
    if (status === 408 || status === 429 || (status >= 500 && status < 600)) {
      return 'temporary';
    }
  }
  // Failed fetches surface as TypeError in the existing API client.
  if (error instanceof TypeError) return 'temporary';
  return 'unexpected';
}
