import { Injectable } from '@nestjs/common';
import type { Board, BoardDetail } from '@kompak/shared';
import { POSITION_STEP } from '../../common/ordering';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { toCard, toList } from './board-mappers';
import { DEFAULT_LIST_NAMES } from './default-lists';

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
    // Proyek baru langsung berisi tiga kolom bawaan (dibuat bersamaan, atomik).
    const board = await this.prisma.board.create({
      data: {
        workspaceId,
        name,
        lists: {
          create: DEFAULT_LIST_NAMES.map((listName, index) => ({
            name: listName,
            position: (index + 1) * POSITION_STEP,
          })),
        },
      },
    });
    return toBoard(board);
  }

  async get(userId: string, boardId: string): Promise<BoardDetail> {
    const board = await this.access.requireBoard(userId, boardId);
    const lists = await this.prisma.list.findMany({
      where: { boardId: board.id, archivedAt: null },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      include: {
        cards: {
          where: { archivedAt: null },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
    });
    return {
      ...toBoard(board),
      lists: lists.map((list) => ({
        ...toList(list),
        cards: list.cards.map(toCard),
      })),
    };
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