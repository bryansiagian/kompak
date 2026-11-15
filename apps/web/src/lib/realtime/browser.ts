import { refreshSession } from '@/lib/api/client';
import { createRealtimeClient } from './client';
import type { RealtimeClient } from './client';
import { createBrowserSocket } from './socket';

let instance: RealtimeClient | null = null;

// Dibuat saat pertama dipakai (di peramban, dari efek), bukan saat modul dimuat,
// supaya tidak berjalan saat prarender di server.
export function getRealtimeClient(): RealtimeClient {
  instance ??= createRealtimeClient({
    createSocket: createBrowserSocket,
    refreshSession: async () => (await refreshSession()) !== null,
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
  return instance;
}