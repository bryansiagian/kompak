import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

// CORS dibaca saat server dibuat (setelah .env dimuat), bukan saat dekorator dievaluasi.
export class RealtimeIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): Server {
    const origin = process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
    ];
    // Menyebarkan options yang opsional membuat semua propertinya opsional,
    // sedangkan Nest meminta ServerOptions lengkap: hasilnya ditegaskan kembali.
    const merged = {
      ...options,
      cors: { origin, credentials: true },
    } as ServerOptions;
    return super.createIOServer(port, merged) as Server;
  }
}