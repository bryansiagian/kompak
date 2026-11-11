import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Card,
  MoveCardInput,
  UpdateCardInput,
} from '@kompak/shared';
import {
  AnchorNotFoundError,
  appendPosition,
  planInsertion,
} from '../../common/ordering';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { toCard } from '../boards/board-mappers';
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
  ) {}

  // Tambah cepat: cukup judul, ditaruh di akhir kolom.
  async create(userId: string, listId: string, title: string): Promise<Card> {
    const list = await this.access.requireList(userId, listId);
    const last = await this.prisma.card.findFirst({
      where: { listId: list.id, archivedAt: null },
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    const card = await this.prisma.card.create({
      data: {
        listId: list.id,
        boardId: list.boardId,
        title,
        position: appendPosition(last?.position ?? null),
        createdById: userId,
      },
    });
    return toCard(card);
  }

  async get(userId: string, cardId: string): Promise<Card> {
    return toCard(await this.access.requireCard(userId, cardId));
  }

  async update(
    userId: string,
    cardId: string,
    input: UpdateCardInput,
  ): Promise<Card> {
    const card = await this.access.requireCard(userId, cardId);
    if (input.assigneeId) {
      await this.assertAssignable(card.workspaceId, input.assigneeId);
    }

    // undefined = tidak diubah, null = dikosongkan.
    const dueDate =
      input.dueDate === undefined || input.dueDate === null
        ? input.dueDate
        : parseDate(input.dueDate);
    const updated = await this.prisma.card.update({
      where: { id: card.id },
      data: {
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        dueDate,
      },
    });
    return toCard(updated);
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
  }

  async move(
    userId: string,
    cardId: string,
    input: MoveCardInput,
  ): Promise<Card> {
    const card = await this.access.requireCard(userId, cardId);
    // Kolom tujuan harus di proyek yang sama (dan otomatis di kelompok yang sama).
    const target = await this.prisma.list.findFirst({
      where: { id: input.listId, boardId: card.boardId, archivedAt: null },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('List not found');
    }

    try {
      const moved = await this.prisma.$transaction(async (tx) => {
        const siblings = await tx.card.findMany({
          where: { listId: target.id, archivedAt: null, id: { not: card.id } },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: { id: true, position: true },
        });
        const plan = planInsertion(siblings, input.beforeCardId);
        for (const item of plan.renumbered) {
          await tx.card.update({
            where: { id: item.id },
            data: { position: item.position },
          });
        }
        return tx.card.update({
          where: { id: card.id },
          data: { listId: target.id, position: plan.position },
        });
      });
      return toCard(moved);
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