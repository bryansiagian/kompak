import {
  applyDecorators,
  createParamDecorator,
  ForbiddenException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { WorkspaceRole } from '../../generated/prisma/enums';
import {
  WORKSPACE_ROLES_KEY,
  WorkspaceMembershipGuard,
} from './workspace-membership.guard';
import type {
  WorkspaceMembership,
  WorkspaceRequest,
} from './workspace-request';

// Tanpa argumen: semua anggota boleh. Dengan argumen: hanya peran yang disebut.
export function WorkspaceAccess(
  ...roles: WorkspaceRole[]
): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    SetMetadata(WORKSPACE_ROLES_KEY, roles),
    UseGuards(WorkspaceMembershipGuard),
  );
}

export const Membership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): WorkspaceMembership => {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    if (!request.membership) {
      throw new ForbiddenException();
    }
    return request.membership;
  },
);