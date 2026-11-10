import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { WorkspaceRole } from '../../generated/prisma/enums';
import { WorkspaceAccessService } from './workspace-access.service';
import type { WorkspaceRequest } from './workspace-request';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: WorkspaceAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const workspaceId = request.params.workspaceId;
    if (!request.user || typeof workspaceId !== 'string') {
      // Dipasang pada rute tanpa :workspaceId: gagal aman, jangan meloloskan.
      throw new ForbiddenException();
    }

    const allowed =
      this.reflector.getAllAndOverride<WorkspaceRole[] | undefined>(
        WORKSPACE_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    const role = await this.access.requireRole(
      request.user.id,
      workspaceId,
      allowed,
    );
    request.membership = { workspaceId, role };
    return true;
  }
}