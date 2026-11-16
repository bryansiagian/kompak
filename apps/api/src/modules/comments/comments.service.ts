import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Comment } from '@kompak/shared';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { toComment } from './comment-mappers';

const MANAGER_ROLES: readonly WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
];
const EXCERPT_LENGTH = 80;
const MAX_COMMENTS_PER_CARD = 500;

function excerptOf(body: string): string {
  return body.length > EXCERPT_LENGTH
    ? `${body.slice(0, EXCERPT_LENGTH)}…`
    : body;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly realtime: RealtimeService,
    private readonly activity: ActivityService,
  ) {}

  async list(userId: string, cardId: string): Promise<Comment[]> {
    const card = await this.access.requireCard(userId, cardId);
    const rows = await this.prisma.comment.findMany({
      where: { cardId: card.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: MAX_COMMENTS_PER_CARD,
      include: { author: { select: { name: true } } },
    });
    return rows.map(toComment);
  }

  async create(userId: string, cardId: string, body: string): Promise<Comment> {
    const card = await this.access.requireCard(userId, cardId);
    const row = await this.prisma.comment.create({
      data: { cardId: card.id, authorId: userId, body },
      include: { author: { select: { name: true } } },
    });
    const comment = toComment(row);
    this.realtime.emitToBoard(card.boardId, {
      type: 'comment.created',
      boardId: card.boardId,
      comment,
    });
    await this.activity.record({
      boardId: card.boardId,
      cardId: card.id,
      actorId: userId,
      type: 'comment.added',
      payload: { title: card.title, excerpt: excerptOf(body) },
    });
    return comment;
  }

  // Hanya penulis yang boleh mengubah isi komentar, termasuk Ketua dan Pengelola.
  async update(userId: string, commentId: string, body: string): Promise<Comment> {
    const found = await this.requireComment(userId, commentId);
    if (found.authorId !== userId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }
    const row = await this.prisma.comment.update({
      where: { id: found.id },
      data: { body },
      include: { author: { select: { name: true } } },
    });
    const comment = toComment(row);
    this.realtime.emitToBoard(found.boardId, {
      type: 'comment.updated',
      boardId: found.boardId,
      comment,
    });
    return comment;
  }

  // Penulis, atau Ketua dan Pengelola (moderasi).
  async remove(userId: string, commentId: string): Promise<void> {
    const found = await this.requireComment(userId, commentId);
    const allowed =
      found.authorId === userId || MANAGER_ROLES.includes(found.role);
    if (!allowed) {
      throw new ForbiddenException(
        'Only the author or a manager can delete this comment',
      );
    }
    await this.prisma.comment.delete({ where: { id: found.id } });
    this.realtime.emitToBoard(found.boardId, {
      type: 'comment.deleted',
      boardId: found.boardId,
      commentId: found.id,
      cardId: found.cardId,
    });
  }

  // Komentar dicari lewat keanggotaan pemanggil, tidak pernah dengan ID saja.
  private async requireComment(userId: string, commentId: string) {
    const row = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        card: {
          archivedAt: null,
          board: {
            archivedAt: null,
            workspace: { members: { some: { userId } } },
          },
        },
      },
      include: {
        card: {
          select: { boardId: true, board: { select: { workspaceId: true } } },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Comment not found');
    }
    const role = await this.access.requireRole(userId, row.card.board.workspaceId);
    return {
      id: row.id,
      cardId: row.cardId,
      authorId: row.authorId,
      boardId: row.card.boardId,
      role,
    };
  }
}