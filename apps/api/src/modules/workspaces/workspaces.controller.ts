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
import {
  createWorkspaceSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from '@kompak/shared';
import type {
  CreateWorkspaceInput,
  InviteCodeResponse,
  Member,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
  WorkspaceDetail,
  WorkspaceSummary,
} from '@kompak/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { WorkspaceRole } from '../../generated/prisma/enums';
import {
  Membership,
  WorkspaceAccess,
} from './workspace-access.decorator';
import type { WorkspaceMembership } from './workspace-request';
import { WorkspacesService } from './workspaces.service';

const ONE_MINUTE_MS = 60_000;

@Controller('workspaces')
@UseGuards(RateLimitGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<WorkspaceSummary[]> {
    return this.workspaces.list(user.id);
  }

  @RateLimit({ limit: 10, windowMs: ONE_MINUTE_MS })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkspaceSchema))
    body: CreateWorkspaceInput,
  ): Promise<WorkspaceDetail> {
    return this.workspaces.create(user.id, body.name);
  }

  @WorkspaceAccess()
  @Get(':workspaceId')
  get(@Membership() membership: WorkspaceMembership): Promise<WorkspaceDetail> {
    return this.workspaces.get(membership.workspaceId, membership.role);
  }

  @WorkspaceAccess(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Patch(':workspaceId')
  rename(
    @Membership() membership: WorkspaceMembership,
    @Body(new ZodValidationPipe(updateWorkspaceSchema))
    body: UpdateWorkspaceInput,
  ): Promise<WorkspaceDetail> {
    return this.workspaces.rename(
      membership.workspaceId,
      body.name,
      membership.role,
    );
  }

  @WorkspaceAccess(WorkspaceRole.OWNER)
  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Membership() membership: WorkspaceMembership): Promise<void> {
    await this.workspaces.remove(membership.workspaceId);
  }

  @WorkspaceAccess()
  @Get(':workspaceId/members')
  listMembers(@Membership() membership: WorkspaceMembership): Promise<Member[]> {
    return this.workspaces.listMembers(membership.workspaceId);
  }

  @WorkspaceAccess(WorkspaceRole.OWNER)
  @Patch(':workspaceId/members/:userId')
  changeRole(
    @Membership() membership: WorkspaceMembership,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema))
    body: UpdateMemberRoleInput,
  ): Promise<Member> {
    return this.workspaces.changeRole(
      membership.workspaceId,
      userId,
      body.role,
    );
  }

  // Semua anggota boleh memanggil (untuk keluar sendiri); aturan lanjutan di service.
  @WorkspaceAccess()
  @Delete(':workspaceId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Membership() membership: WorkspaceMembership,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.workspaces.removeMember(
      user.id,
      membership.role,
      membership.workspaceId,
      userId,
    );
  }

  @WorkspaceAccess(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Post(':workspaceId/invite/regenerate')
  @HttpCode(HttpStatus.OK)
  regenerateInvite(
    @Membership() membership: WorkspaceMembership,
  ): Promise<InviteCodeResponse> {
    return this.workspaces.regenerateInvite(membership.workspaceId);
  }
}