import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import type { WorkspaceRole } from '../../generated/prisma/enums';

export interface WorkspaceMembership {
  workspaceId: string;
  role: WorkspaceRole;
}

export interface WorkspaceRequest extends AuthenticatedRequest {
  membership?: WorkspaceMembership;
}