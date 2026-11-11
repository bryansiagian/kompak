const STORAGE_KEY = 'kompak:next-path';

// Hanya jalur internal: mencegah pengalihan ke situs lain.
export function isSafeNextPath(path: string | null | undefined): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\')
  );
}

export function setNextPath(path: string): void {
  if (!isSafeNextPath(path)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // Penyimpanan tidak tersedia (mis. mode privat): lanjut tanpa tujuan.
  }
}

export function peekNextPath(): string | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return isSafeNextPath(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearNextPath(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Tidak ada yang perlu dibersihkan.
  }
}