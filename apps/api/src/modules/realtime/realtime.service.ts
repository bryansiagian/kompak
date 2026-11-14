import { Injectable, Logger } from '@nestjs/common';
import { ACCESS_REVOKED_EVENT } from '@kompak/shared';
import type { AccessRevoked, BoardEvent, PresenceUser } from '@kompak/shared';
import type { Server } from 'socket.io';
import { boardRoom, workspaceRoom } from './realtime.constants';
import type { SocketData } from './realtime.constants';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  emitToBoard(boardId: string, event: BoardEvent): void {
    this.server?.to(boardRoom(boardId)).emit(event.type, event);
  }

  // Pengguna unik di ruang papan: satu orang dengan dua tab dihitung sekali.
  async presenceOf(boardId: string): Promise<PresenceUser[]> {
    if (!this.server) {
      return [];
    }
    const sockets = await this.server.in(boardRoom(boardId)).fetchSockets();
    const users = new Map<string, PresenceUser>();
    for (const socket of sockets) {
      const data = socket.data as SocketData | undefined;
      if (data?.user) {
        users.set(data.user.id, { userId: data.user.id, name: data.user.name });
      }
    }
    return [...users.values()].sort(
      (a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId),
    );
  }

  async broadcastPresence(boardId: string): Promise<void> {
    try {
      const users = await this.presenceOf(boardId);
      this.emitToBoard(boardId, { type: 'presence.updated', boardId, users });
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast presence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Papan dihapus: kabari semua penonton lalu keluarkan mereka dari ruangnya.
  closeBoard(boardId: string): void {
    if (!this.server) {
      return;
    }
    this.emitToBoard(boardId, { type: 'board.deleted', boardId });
    this.server.in(boardRoom(boardId)).socketsLeave(boardRoom(boardId));
  }

  // Anggota keluar atau dikeluarkan (userId diisi), atau kelompok dihapus (userId
  // kosong): cabut akses real-time ke semua papan kelompok itu. Kegagalan hanya
  // dicatat agar tidak membatalkan permintaan REST yang sudah berhasil.
  async revokeAccess(workspaceId: string, userId?: string): Promise<void> {
    if (!this.server) {
      return;
    }
    try {
      const sockets = await this.server
        .in(workspaceRoom(workspaceId))
        .fetchSockets();
      const affectedBoards = new Set<string>();
      const payload: AccessRevoked = { workspaceId };

      for (const socket of sockets) {
        const data = socket.data as SocketData | undefined;
        if (!data?.user) continue;
        if (userId !== undefined && data.user.id !== userId) continue;

        for (const [boardId, owner] of Object.entries(data.boards)) {
          if (owner === workspaceId) {
            socket.leave(boardRoom(boardId));
            affectedBoards.add(boardId);
          }
        }
        socket.leave(workspaceRoom(workspaceId));
        socket.emit(ACCESS_REVOKED_EVENT, payload);
      }

      for (const boardId of affectedBoards) {
        await this.broadcastPresence(boardId);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to revoke real-time access: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}