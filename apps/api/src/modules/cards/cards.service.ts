import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Card, MoveCardInput, UpdateCardInput } from '@kompak/shared';
import {
  AnchorNotFoundError,
  appendPosition,
  planInsertion,
} from '../../common/ordering';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { toCard } from '../boards/board-mappers';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';

const MANAGER_ROLES: readonly WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
];

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly realtime: RealtimeService,
  ) {}

  // Tambah cepat: cukup judul, ditaruh di akhir kolom.
  async create(userId: string, listId: string, title: string): Promise<Card> {
    const list = await this.access.requireList(userId, listId);
    const last = await this.prisma.card.findFirst({
      where: { listId: list.id, archivedAt: null },
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    const created = await this.prisma.card.create({
      data: {
        listId: list.id,
        boardId: list.boardId,
        title,
        position: appendPosition(last?.position ?? null),
        createdById: userId,
      },
    });
    const card = toCard(created);
    this.realtime.emitToBoard(list.boardId, {
      type: 'card.created',
      boardId: list.boardId,
      card,
    });
    return card;
  }

  async get(userId: string, cardId: string): Promise<Card> {
    return toCard(await this.access.requireCard(userId, cardId));
  }

  async update(
    userId: string,
    cardId: string,
    input: UpdateCardInput,
  ): Promise<Card> {
    const current = await this.access.requireCard(userId, cardId);
    if (input.assigneeId) {
      await this.assertAssignable(current.workspaceId, input.assigneeId);
    }

    // undefined = tidak diubah, null = dikosongkan.
    const dueDate =
      input.dueDate === undefined || input.dueDate === null
        ? input.dueDate
        : parseDate(input.dueDate);
    const updated = await this.prisma.card.update({
      where: { id: current.id },
      data: {
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        dueDate,
      },
    });
    const card = toCard(updated);
    this.realtime.emitToBoard(current.boardId, {
      type: 'card.updated',
      boardId: current.boardId,
      card,
    });
    return card;
  }

  async remove(userId: string, cardId: string): Promise<void> {
    const card = await this.access.requireCard(userId, cardId);
    const allowed =
      card.createdById === userId || MANAGER_ROLES.includes(card.role);
    if (!allowed) {
      throw new ForbiddenException(
        'Only the creator or a manager can delete this task',
      );
    }
    await this.prisma.card.delete({ where: { id: card.id } });
    this.realtime.emitToBoard(card.boardId, {
      type: 'card.deleted',
      boardId: card.boardId,
      cardId: card.id,
      listId: card.listId,
    });
  }

  async move(
    userId: string,
    cardId: string,
    input: MoveCardInput,
  ): Promise<Card> {
    const current = await this.access.requireCard(userId, cardId);
    // Kolom tujuan harus di proyek yang sama (dan otomatis di kelompok yang sama).
    const target = await this.prisma.list.findFirst({
      where: { id: input.listId, boardId: current.boardId, archivedAt: null },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('List not found');
    }

    const moved = await this.persistMove(current.id, target.id, input.beforeCardId);
    const card = toCard(moved);
    this.realtime.emitToBoard(current.boardId, {
      type: 'card.moved',
      boardId: current.boardId,
      card,
      fromListId: current.listId,
      order: await this.orderedCardIds(target.id),
    });
    return card;
  }

  private async persistMove(
    cardId: string,
    targetListId: string,
    beforeCardId: string | null,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const siblings = await tx.card.findMany({
          where: { listId: targetListId, archivedAt: null, id: { not: cardId } },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: { id: true, position: true },
        });
        const plan = planInsertion(siblings, beforeCardId);
        for (const item of plan.renumbered) {
          await tx.card.update({
            where: { id: item.id },
            data: { position: item.position },
          });
        }
        return tx.card.update({
          where: { id: cardId },
          data: { listId: targetListId, position: plan.position },
        });
      });
    } catch (error) {
      if (error instanceof AnchorNotFoundError) {
        throw new BadRequestException({
          message: 'The anchor task is not in the destination list',
          code: 'ANCHOR_NOT_FOUND',
        });
      }
      throw error;
    }
  }

  private async orderedCardIds(listId: string): Promise<string[]> {
    const cards = await this.prisma.card.findMany({
      where: { listId, archivedAt: null },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return cards.map((card) => card.id);
  }

  private async assertAssignable(
    workspaceId: string,
    assigneeId: string,
  ): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
      select: { userId: true },
    });
    if (!member) {
      throw new BadRequestException({
        message: 'The assignee must be a member of the workspace',
        code: 'ASSIGNEE_NOT_MEMBER',
      });
    }
  }
}