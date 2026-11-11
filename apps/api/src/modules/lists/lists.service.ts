import { BadRequestException, Injectable } from '@nestjs/common';
import type { List } from '@kompak/shared';
import {
  AnchorNotFoundError,
  appendPosition,
  planInsertion,
} from '../../common/ordering';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { toList } from '../boards/board-mappers';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

const MANAGER_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async create(userId: string, boardId: string, name: string): Promise<List> {
    const board = await this.access.requireBoard(
      userId,
      boardId,
      MANAGER_ROLES,
    );
    const last = await this.prisma.list.findFirst({
      where: { boardId: board.id, archivedAt: null },
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    const list = await this.prisma.list.create({
      data: {
        boardId: board.id,
        name,
        position: appendPosition(last?.position ?? null),
      },
    });
    return toList(list);
  }

  async rename(userId: string, listId: string, name: string): Promise<List> {
    const list = await this.access.requireList(userId, listId, MANAGER_ROLES);
    const updated = await this.prisma.list.update({
      where: { id: list.id },
      data: { name },
    });
    return toList(updated);
  }

  async remove(userId: string, listId: string): Promise<void> {
    const list = await this.access.requireList(userId, listId, MANAGER_ROLES);
    // Tugas di dalamnya ikut terhapus (onDelete: Cascade).
    await this.prisma.list.delete({ where: { id: list.id } });
  }

  async move(
    userId: string,
    listId: string,
    beforeListId: string | null,
  ): Promise<List> {
    const list = await this.access.requireList(userId, listId, MANAGER_ROLES);
    try {
      const moved = await this.prisma.$transaction(async (tx) => {
        const siblings = await tx.list.findMany({
          where: { boardId: list.boardId, archivedAt: null, id: { not: list.id } },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: { id: true, position: true },
        });
        const plan = planInsertion(siblings, beforeListId);
        for (const item of plan.renumbered) {
          await tx.list.update({
            where: { id: item.id },
            data: { position: item.position },
          });
        }
        return tx.list.update({
          where: { id: list.id },
          data: { position: plan.position },
        });
      });
      return toList(moved);
    } catch (error) {
      if (error instanceof AnchorNotFoundError) {
        throw new BadRequestException({
          message: 'The anchor list is not in this board',
          code: 'ANCHOR_NOT_FOUND',
        });
      }
      throw error;
    }
  }
}