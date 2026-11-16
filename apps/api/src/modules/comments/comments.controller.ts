import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createCommentSchema, updateCommentSchema } from '@kompak/shared';
import type {
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { CommentsService } from './comments.service';

const ONE_MINUTE_MS = 60_000;

@Controller()
@UseGuards(RateLimitGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('cards/:cardId/comments')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
  ): Promise<Comment[]> {
    return this.comments.list(user.id, cardId);
  }

  @RateLimit({ limit: 30, windowMs: ONE_MINUTE_MS })
  @Post('cards/:cardId/comments')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentInput,
  ): Promise<Comment> {
    return this.comments.create(user.id, cardId, body.body);
  }

  @Patch('comments/:commentId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: UpdateCommentInput,
  ): Promise<Comment> {
    return this.comments.update(user.id, commentId, body.body);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.comments.remove(user.id, commentId);
  }
}