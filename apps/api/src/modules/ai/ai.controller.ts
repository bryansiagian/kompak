import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { AiSubtasks, AiSummary } from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { AiService } from './ai.service';

@Controller('cards/:cardId/ai')
@UseGuards(RateLimitGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('subtasks')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  subtasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
  ): Promise<AiSubtasks> {
    return this.ai.subtasks(user.id, cardId);
  }

  @Post('summary')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
  ): Promise<AiSummary> {
    return this.ai.summary(user.id, cardId);
  }
}
