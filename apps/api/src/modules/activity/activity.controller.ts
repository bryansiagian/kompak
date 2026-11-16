import { Controller, Get, Param, Query } from '@nestjs/common';
import { activityQuerySchema } from '@kompak/shared';
import type { Activity, ActivityQuery } from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { ActivityService } from './activity.service';

@Controller()
export class ActivityController {
  constructor(
    private readonly activity: ActivityService,
    private readonly access: WorkspaceAccessService,
  ) {}

  @Get('boards/:boardId/activity')
  async forBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Query(new ZodValidationPipe(activityQuerySchema)) query: ActivityQuery,
  ): Promise<Activity[]> {
    const board = await this.access.requireBoard(user.id, boardId);
    return this.activity.listForBoard(board.id, query);
  }

  // Tugas yang sudah dihapus tidak punya akses lagi; catatannya tetap ada di riwayat proyek.
  @Get('cards/:cardId/activity')
  async forCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Query(new ZodValidationPipe(activityQuerySchema)) query: ActivityQuery,
  ): Promise<Activity[]> {
    const card = await this.access.requireCard(user.id, cardId);
    return this.activity.listForCard(card.id, query);
  }
}