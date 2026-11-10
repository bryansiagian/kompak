export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_COOKIE_NAME = 'kompak_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export const EMAIL_CODE_TTL_MINUTES = 15;
export const EMAIL_CODE_TTL_MS = EMAIL_CODE_TTL_MINUTES * 60 * 1000;
export const EMAIL_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;