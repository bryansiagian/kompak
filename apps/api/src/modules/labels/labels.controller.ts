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
import { createLabelSchema, updateLabelSchema } from '@kompak/shared';
import type {
  CreateLabelInput,
  Label,
  UpdateLabelInput,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { LabelsService } from './labels.service';

@Controller()
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Post('boards/:boardId/labels')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body(new ZodValidationPipe(createLabelSchema)) body: CreateLabelInput,
  ): Promise<Label> {
    return this.labels.create(user.id, boardId, body);
  }

  @Patch('labels/:labelId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId') labelId: string,
    @Body(new ZodValidationPipe(updateLabelSchema)) body: UpdateLabelInput,
  ): Promise<Label> {
    return this.labels.update(user.id, labelId, body);
  }

  @Delete('labels/:labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId') labelId: string,
  ): Promise<void> {
    await this.labels.remove(user.id, labelId);
  }
}