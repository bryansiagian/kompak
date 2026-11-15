import type { PresenceUser } from '@kompak/shared';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

// Warna tetap per pengguna: hash sederhana dari ID, bukan acak.
export function colorIndexOf(userId: string, size: number): number {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % size;
}

export function othersOf(
  users: readonly PresenceUser[],
  selfId: string,
): PresenceUser[] {
  return users.filter((user) => user.userId !== selfId);
}

export function visibleAvatars(
  users: readonly PresenceUser[],
  max: number,
): { shown: PresenceUser[]; hidden: number } {
  return {
    shown: users.slice(0, max),
    hidden: Math.max(0, users.length - max),
  };
}