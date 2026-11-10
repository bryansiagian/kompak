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
} from '@nestjs/common';
import { createBoardSchema, updateBoardSchema } from '@kompak/shared';
import type {
  Board,
  CreateBoardInput,
  UpdateBoardInput,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { WorkspaceRole } from '../../generated/prisma/enums';
import {
  Membership,
  WorkspaceAccess,
} from '../workspaces/workspace-access.decorator';
import type { WorkspaceMembership } from '../workspaces/workspace-request';
import { BoardsService } from './boards.service';

@Controller()
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @WorkspaceAccess()
  @Get('workspaces/:workspaceId/boards')
  list(@Membership() membership: WorkspaceMembership): Promise<Board[]> {
    return this.boards.list(membership.workspaceId);
  }

  @WorkspaceAccess(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Post('workspaces/:workspaceId/boards')
  create(
    @Membership() membership: WorkspaceMembership,
    @Body(new ZodValidationPipe(createBoardSchema)) body: CreateBoardInput,
  ): Promise<Board> {
    return this.boards.create(membership.workspaceId, body.name);
  }

  @Get('boards/:boardId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
  ): Promise<Board> {
    return this.boards.get(user.id, boardId);
  }

  @Patch('boards/:boardId')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body(new ZodValidationPipe(updateBoardSchema)) body: UpdateBoardInput,
  ): Promise<Board> {
    return this.boards.rename(user.id, boardId, body.name);
  }

  @Delete('boards/:boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
  ): Promise<void> {
    await this.boards.remove(user.id, boardId);
  }
}