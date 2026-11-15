import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  BOARD_JOIN_EVENT,
  BOARD_LEAVE_EVENT,
  joinBoardSchema,
} from '@kompak/shared';
import type { JoinBoardAck } from '@kompak/shared';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { boardRoom, workspaceRoom } from './realtime.constants';
import type { SocketData } from './realtime.constants';
import { RealtimeService } from './realtime.service';

const BOARD_ROOM_PREFIX = 'board:';

function unauthorizedError(): Error & { data: { code: string } } {
  return Object.assign(new Error('unauthorized'), {
    data: { code: 'UNAUTHORIZED' },
  });
}

function boardIdsOf(socket: Socket): string[] {
  return [...socket.rooms]
    .filter((room) => room.startsWith(BOARD_ROOM_PREFIX))
    .map((room) => room.slice(BOARD_ROOM_PREFIX.length));
}

// Gateway memakai port HTTP yang sama. CORS diatur di RealtimeIoAdapter karena
// variabel lingkungan baru terbaca setelah ConfigModule dimuat.
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);

    // Koneksi tanpa access token yang valid ditolak sebelum tersambung.
    server.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        () => next(unauthorizedError()),
      );
    });

    server.on('connection', (socket) => {
      let boardIds: string[] = [];
      // Pada 'disconnecting' soket masih ada di ruangnya; presence disiarkan
      // setelah 'disconnect', saat soket sudah benar-benar keluar.
      socket.on('disconnecting', () => {
        boardIds = boardIdsOf(socket);
      });
      socket.on('disconnect', () => {
        for (const boardId of boardIds) {
          void this.realtime.broadcastPresence(boardId);
        }
      });
    });
  }

  @SubscribeMessage(BOARD_JOIN_EVENT)
  async join(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<JoinBoardAck> {
    const parsed = joinBoardSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, code: 'BAD_REQUEST' };
    }

    const data = socket.data as SocketData;
    // Anggota kelompok mana pun boleh menonton papan; peran tidak dibutuhkan.
    // Papan dicari lewat keanggotaan, bukan dengan ID saja.
    const board = await this.prisma.board.findFirst({
      where: {
        id: parsed.data.boardId,
        archivedAt: null,
        workspace: { members: { some: { userId: data.user.id } } },
      },
      select: { id: true, workspaceId: true },
    });
    if (!board) {
      return { ok: false, code: 'NOT_FOUND' };
    }

    await socket.join([boardRoom(board.id), workspaceRoom(board.workspaceId)]);
    data.boards[board.id] = board.workspaceId;

    await this.realtime.broadcastPresence(board.id);
    return { ok: true, users: await this.realtime.presenceOf(board.id) };
  }

  @SubscribeMessage(BOARD_LEAVE_EVENT)
  async leave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ ok: boolean }> {
    const parsed = joinBoardSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false };
    }

    const data = socket.data as SocketData;
    const { boardId } = parsed.data;
    const workspaceId = data.boards[boardId];
    await socket.leave(boardRoom(boardId));
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete data.boards[boardId];
    if (workspaceId && !Object.values(data.boards).includes(workspaceId)) {
      await socket.leave(workspaceRoom(workspaceId));
    }

    await this.realtime.broadcastPresence(boardId);
    return { ok: true };
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== 'string') {
      throw new Error('missing token');
    }
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true },
    });
    if (!user) {
      throw new Error('unknown user');
    }
    const data: SocketData = { user, boards: {} };
    socket.data = data;
  }
}