import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { inviteCodeSchema } from '@kompak/shared';
import type { InvitePreview, JoinResponse } from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { WorkspacesService } from './workspaces.service';

const ONE_MINUTE_MS = 60_000;

@Controller('invites')
@UseGuards(RateLimitGuard)
export class InvitesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  // Publik: tamu yang membuka tautan undangan perlu tahu nama kelompoknya
  // sebelum masuk atau mendaftar.
  @Public()
  @RateLimit({ limit: 30, windowMs: ONE_MINUTE_MS })
  @Get(':code')
  preview(
    @Param('code', new ZodValidationPipe(inviteCodeSchema)) code: string,
  ): Promise<InvitePreview> {
    return this.workspaces.previewInvite(code);
  }

  @RateLimit({ limit: 20, windowMs: ONE_MINUTE_MS })
  @Post(':code/join')
  @HttpCode(HttpStatus.OK)
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code', new ZodValidationPipe(inviteCodeSchema)) code: string,
  ): Promise<JoinResponse> {
    return this.workspaces.join(user.id, code);
  }
}