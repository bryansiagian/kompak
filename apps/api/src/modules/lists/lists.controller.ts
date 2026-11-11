import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createListSchema,
  moveListSchema,
  updateListSchema,
} from '@kompak/shared';
import type {
  CreateListInput,
  List,
  MoveListInput,
  UpdateListInput,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { ListsService } from './lists.service';

@Controller()
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  @Post('boards/:boardId/lists')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body(new ZodValidationPipe(createListSchema)) body: CreateListInput,
  ): Promise<List> {
    return this.lists.create(user.id, boardId, body.name);
  }

  @Patch('lists/:listId')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId') listId: string,
    @Body(new ZodValidationPipe(updateListSchema)) body: UpdateListInput,
  ): Promise<List> {
    return this.lists.rename(user.id, listId, body.name);
  }

  @Delete('lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId') listId: string,
  ): Promise<void> {
    await this.lists.remove(user.id, listId);
  }

  @Patch('lists/:listId/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId') listId: string,
    @Body(new ZodValidationPipe(moveListSchema)) body: MoveListInput,
  ): Promise<List> {
    return this.lists.move(user.id, listId, body.beforeListId);
  }
}