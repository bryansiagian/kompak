// Access token sengaja hanya di memori (bukan localStorage) agar tidak bisa
// dibaca skrip lain. Sesi dipulihkan lewat cookie refresh httpOnly.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}