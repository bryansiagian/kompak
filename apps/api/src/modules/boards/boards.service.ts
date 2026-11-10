import { Injectable } from '@nestjs/common';
import type { Board } from '@kompak/shared';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

const MANAGER_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

function toBoard(board: {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: Date;
}): Board {
  return {
    id: board.id,
    workspaceId: board.workspaceId,
    name: board.name,
    createdAt: board.createdAt.toISOString(),
  };
}

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  // list dan create dipanggil setelah WorkspaceMembershipGuard memverifikasi peran.
  async list(workspaceId: string): Promise<Board[]> {
    const boards = await this.prisma.board.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return boards.map(toBoard);
  }

  async create(workspaceId: string, name: string): Promise<Board> {
    const board = await this.prisma.board.create({
      data: { workspaceId, name },
    });
    return toBoard(board);
  }

  async get(userId: string, boardId: string): Promise<Board> {
    return toBoard(await this.access.requireBoard(userId, boardId));
  }

  async rename(userId: string, boardId: string, name: string): Promise<Board> {
    const board = await this.access.requireBoard(
      userId,
      boardId,
      MANAGER_ROLES,
    );
    const updated = await this.prisma.board.update({
      where: { id: board.id },
      data: { name },
    });
    return toBoard(updated);
  }

  async remove(userId: string, boardId: string): Promise<void> {
    const board = await this.access.requireBoard(
      userId,
      boardId,
      MANAGER_ROLES,
    );
    await this.prisma.board.delete({ where: { id: board.id } });
  }
}