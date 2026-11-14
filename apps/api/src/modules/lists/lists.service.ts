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
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

const MANAGER_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly realtime: RealtimeService,
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
    const created = await this.prisma.list.create({
      data: {
        boardId: board.id,
        name,
        position: appendPosition(last?.position ?? null),
      },
    });
    const list = toList(created);
    this.realtime.emitToBoard(board.id, {
      type: 'list.created',
      boardId: board.id,
      list,
    });
    return list;
  }

  async rename(userId: string, listId: string, name: string): Promise<List> {
    const current = await this.access.requireList(userId, listId, MANAGER_ROLES);
    const updated = await this.prisma.list.update({
      where: { id: current.id },
      data: { name },
    });
    const list = toList(updated);
    this.realtime.emitToBoard(current.boardId, {
      type: 'list.updated',
      boardId: current.boardId,
      list,
    });
    return list;
  }

  async remove(userId: string, listId: string): Promise<void> {
    const list = await this.access.requireList(userId, listId, MANAGER_ROLES);
    // Tugas di dalamnya ikut terhapus (onDelete: Cascade).
    await this.prisma.list.delete({ where: { id: list.id } });
    this.realtime.emitToBoard(list.boardId, {
      type: 'list.deleted',
      boardId: list.boardId,
      listId: list.id,
    });
  }

  async move(
    userId: string,
    listId: string,
    beforeListId: string | null,
  ): Promise<List> {
    const current = await this.access.requireList(userId, listId, MANAGER_ROLES);
    const moved = await this.persistMove(current.id, current.boardId, beforeListId);
    const list = toList(moved);
    this.realtime.emitToBoard(current.boardId, {
      type: 'list.moved',
      boardId: current.boardId,
      list,
      order: await this.orderedListIds(current.boardId),
    });
    return list;
  }

  private async persistMove(
    listId: string,
    boardId: string,
    beforeListId: string | null,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const siblings = await tx.list.findMany({
          where: { boardId, archivedAt: null, id: { not: listId } },
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
          where: { id: listId },
          data: { position: plan.position },
        });
      });
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

  private async orderedListIds(boardId: string): Promise<string[]> {
    const lists = await this.prisma.list.findMany({
      where: { boardId, archivedAt: null },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return lists.map((list) => list.id);
  }
}