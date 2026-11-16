import { Injectable, Logger } from '@nestjs/common';
import type { Activity, ActivityDetail, ActivityQuery } from '@kompak/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { toActivity } from './activity-mappers';

export type ActivityEntry = {
  boardId: string;
  cardId: string | null;
  actorId: string;
} & ActivityDetail;

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  // Riwayat adalah catatan tambahan: kegagalan mencatatnya hanya masuk log dan
  // tidak boleh membatalkan perubahan yang sudah tersimpan.
  async record(entry: ActivityEntry): Promise<void> {
    try {
      const row = await this.prisma.activity.create({
        data: {
          boardId: entry.boardId,
          cardId: entry.cardId,
          actorId: entry.actorId,
          type: entry.type,
          payload: entry.payload,
        },
        include: { actor: { select: { name: true } } },
      });
      const activity = toActivity(row);
      if (activity) {
        this.realtime.emitToBoard(entry.boardId, {
          type: 'activity.created',
          boardId: entry.boardId,
          activity,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to record ${entry.type}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Dipanggil setelah pemanggil memastikan akses ke papan atau tugasnya.
  listForBoard(boardId: string, query: ActivityQuery): Promise<Activity[]> {
    return this.list({ boardId }, query);
  }

  listForCard(cardId: string, query: ActivityQuery): Promise<Activity[]> {
    return this.list({ cardId }, query);
  }

  private async list(
    where: { boardId: string } | { cardId: string },
    query: ActivityQuery,
  ): Promise<Activity[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        ...where,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      include: { actor: { select: { name: true } } },
    });
    return rows.flatMap((row) => toActivity(row) ?? []);
  }
}