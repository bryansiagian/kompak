import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MAX_LABELS_PER_BOARD,
} from '@kompak/shared';
import type {
  CreateLabelInput,
  Label,
  UpdateLabelInput,
} from '@kompak/shared';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { toLabel } from './label-mappers';

const MANAGER_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(
    userId: string,
    boardId: string,
    input: CreateLabelInput,
  ): Promise<Label> {
    const board = await this.access.requireBoard(
      userId,
      boardId,
      MANAGER_ROLES,
    );
    const count = await this.prisma.label.count({
      where: { boardId: board.id },
    });
    if (count >= MAX_LABELS_PER_BOARD) {
      throw new BadRequestException({
        message: `A board can have at most ${MAX_LABELS_PER_BOARD} labels`,
        code: 'LABEL_LIMIT',
      });
    }

    const created = await this.prisma.label.create({
      data: { boardId: board.id, name: input.name, color: input.color },
    });
    const label = toLabel(created);
    this.realtime.emitToBoard(board.id, {
      type: 'label.created',
      boardId: board.id,
      label,
    });
    return label;
  }

  async update(
    userId: string,
    labelId: string,
    input: UpdateLabelInput,
  ): Promise<Label> {
    const current = await this.access.requireLabel(
      userId,
      labelId,
      MANAGER_ROLES,
    );
    const updated = await this.prisma.label.update({
      where: { id: current.id },
      data: { name: input.name, color: input.color },
    });
    const label = toLabel(updated);
    this.realtime.emitToBoard(current.boardId, {
      type: 'label.updated',
      boardId: current.boardId,
      label,
    });
    return label;
  }

  async remove(userId: string, labelId: string): Promise<void> {
    const label = await this.access.requireLabel(
      userId,
      labelId,
      MANAGER_ROLES,
    );
    // Terlepas dari semua tugas (CardLabel ikut terhapus lewat onDelete: Cascade).
    await this.prisma.label.delete({ where: { id: label.id } });
    this.realtime.emitToBoard(label.boardId, {
      type: 'label.deleted',
      boardId: label.boardId,
      labelId: label.id,
    });
  }
}