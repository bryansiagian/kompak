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

export interface ListRecord {
  id: string;
  boardId: string;
  workspaceId: string;
  name: string;
  position: number;
  role: WorkspaceRole;
}

export interface CardRecord {
  id: string;
  listId: string;
  boardId: string;
  workspaceId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: Date | null;
  position: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  labels: { labelId: string }[];
  role: WorkspaceRole;
}

export interface LabelRecord {
  id: string;
  boardId: string;
  workspaceId: string;
  name: string;
  color: string;
  role: WorkspaceRole;
}

// Semua objek diambil lewat keanggotaan pemanggil, tidak pernah dengan ID saja.
// Bukan anggota: 404 (keberadaan tidak dibocorkan). Peran kurang: 403.
@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

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

  async requireList(
    userId: string,
    listId: string,
    allowed: readonly WorkspaceRole[] = [],
  ): Promise<ListRecord> {
    const list = await this.prisma.list.findFirst({
      where: {
        id: listId,
        archivedAt: null,
        board: {
          archivedAt: null,
          workspace: { members: { some: { userId } } },
        },
      },
      include: { board: { select: { workspaceId: true } } },
    });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    const role = await this.requireRole(userId, list.board.workspaceId, allowed);
    return {
      id: list.id,
      boardId: list.boardId,
      workspaceId: list.board.workspaceId,
      name: list.name,
      position: list.position,
      role,
    };
  }

  async requireCard(
    userId: string,
    cardId: string,
    allowed: readonly WorkspaceRole[] = [],
  ): Promise<CardRecord> {
    const card = await this.prisma.card.findFirst({
      where: {
        id: cardId,
        archivedAt: null,
        list: { archivedAt: null },
        board: {
          archivedAt: null,
          workspace: { members: { some: { userId } } },
        },
      },
      include: {
        board: { select: { workspaceId: true } },
        labels: { select: { labelId: true } },
      },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    const role = await this.requireRole(userId, card.board.workspaceId, allowed);
    return {
      id: card.id,
      listId: card.listId,
      boardId: card.boardId,
      workspaceId: card.board.workspaceId,
      title: card.title,
      description: card.description,
      assigneeId: card.assigneeId,
      dueDate: card.dueDate,
      position: card.position,
      createdById: card.createdById,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      labels: card.labels,
      role,
    };
  }

  async requireLabel(
    userId: string,
    labelId: string,
    allowed: readonly WorkspaceRole[] = [],
  ): Promise<LabelRecord> {
    const label = await this.prisma.label.findFirst({
      where: {
        id: labelId,
        board: {
          archivedAt: null,
          workspace: { members: { some: { userId } } },
        },
      },
      include: { board: { select: { workspaceId: true } } },
    });
    if (!label) {
      throw new NotFoundException('Label not found');
    }
    const role = await this.requireRole(userId, label.board.workspaceId, allowed);
    return {
      id: label.id,
      boardId: label.boardId,
      workspaceId: label.board.workspaceId,
      name: label.name,
      color: label.color,
      role,
    };
  }
}