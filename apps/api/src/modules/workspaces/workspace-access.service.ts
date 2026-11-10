import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export interface BoardRecord {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // Bukan anggota: 404 (keberadaan kelompok tidak dibocorkan).
  // Anggota dengan peran kurang: 403.
  async requireRole(
    userId: string,
    workspaceId: string,
    allowed: readonly WorkspaceRole[] = [],
  ): Promise<WorkspaceRole> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    if (allowed.length > 0 && !allowed.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return membership.role;
  }

  // Papan selalu dicari lewat keanggotaan, tidak pernah dengan ID saja.
  async requireBoard(
    userId: string,
    boardId: string,
    allowed: readonly WorkspaceRole[] = [],
  ): Promise<BoardRecord> {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        archivedAt: null,
        workspace: { members: { some: { userId } } },
      },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    await this.requireRole(userId, board.workspaceId, allowed);
    return board;
  }
}