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
  Put,
} from '@nestjs/common';
import {
  createCardSchema,
  moveCardSchema,
  setCardLabelsSchema,
  updateCardSchema,
} from '@kompak/shared';
import type {
  Card,
  CreateCardInput,
  MoveCardInput,
  SetCardLabelsInput,
  UpdateCardInput,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { CardsService } from './cards.service';

@Controller()
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post('lists/:listId/cards')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listId') listId: string,
    @Body(new ZodValidationPipe(createCardSchema)) body: CreateCardInput,
  ): Promise<Card> {
    return this.cards.create(user.id, listId, body.title);
  }

  @Get('cards/:cardId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
  ): Promise<Card> {
    return this.cards.get(user.id, cardId);
  }

  @Patch('cards/:cardId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(updateCardSchema)) body: UpdateCardInput,
  ): Promise<Card> {
    return this.cards.update(user.id, cardId, body);
  }

  @Put('cards/:cardId/labels')
  setLabels(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(setCardLabelsSchema)) body: SetCardLabelsInput,
  ): Promise<Card> {
    return this.cards.setLabels(user.id, cardId, body.labelIds);
  }

  @Delete('cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
  ): Promise<void> {
    await this.cards.remove(user.id, cardId);
  }

  @Patch('cards/:cardId/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(moveCardSchema)) body: MoveCardInput,
  ): Promise<Card> {
    return this.cards.move(user.id, cardId, body);
  }
}