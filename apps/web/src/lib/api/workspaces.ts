import {
  boardListSchema,
  boardSchema,
  inviteCodeResponseSchema,
  invitePreviewSchema,
  joinResponseSchema,
  memberSchema,
  memberListSchema,
  workspaceDetailSchema,
  workspaceSummaryListSchema,
} from '@kompak/shared';
import type {
  CreateBoardInput,
  CreateWorkspaceInput,
  UpdateBoardInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
} from '@kompak/shared';
import { apiNoContent, apiRequest } from './client';

const enc = encodeURIComponent;

export function listWorkspaces() {
  return apiRequest('/workspaces', { schema: workspaceSummaryListSchema });
}

export function createWorkspace(input: CreateWorkspaceInput) {
  return apiRequest('/workspaces', {
    method: 'POST',
    body: input,
    schema: workspaceDetailSchema,
  });
}

export function getWorkspace(workspaceId: string) {
  return apiRequest(`/workspaces/${enc(workspaceId)}`, {
    schema: workspaceDetailSchema,
  });
}

export function renameWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput,
) {
  return apiRequest(`/workspaces/${enc(workspaceId)}`, {
    method: 'PATCH',
    body: input,
    schema: workspaceDetailSchema,
  });
}

export function deleteWorkspace(workspaceId: string) {
  return apiNoContent(`/workspaces/${enc(workspaceId)}`, { method: 'DELETE' });
}

export function listMembers(workspaceId: string) {
  return apiRequest(`/workspaces/${enc(workspaceId)}/members`, {
    schema: memberListSchema,
  });
}

export function changeMemberRole(
  workspaceId: string,
  userId: string,
  role: UpdateMemberRoleInput['role'],
) {
  return apiRequest(`/workspaces/${enc(workspaceId)}/members/${enc(userId)}`, {
    method: 'PATCH',
    body: { role },
    schema: memberSchema,
  });
}

export function removeMember(workspaceId: string, userId: string) {
  return apiNoContent(
    `/workspaces/${enc(workspaceId)}/members/${enc(userId)}`,
    { method: 'DELETE' },
  );
}

export function regenerateInvite(workspaceId: string) {
  return apiRequest(`/workspaces/${enc(workspaceId)}/invite/regenerate`, {
    method: 'POST',
    schema: inviteCodeResponseSchema,
  });
}

export function getInvitePreview(code: string) {
  return apiRequest(`/invites/${enc(code)}`, { schema: invitePreviewSchema });
}

export function joinWorkspace(code: string) {
  return apiRequest(`/invites/${enc(code)}/join`, {
    method: 'POST',
    schema: joinResponseSchema,
  });
}

export function listBoards(workspaceId: string) {
  return apiRequest(`/workspaces/${enc(workspaceId)}/boards`, {
    schema: boardListSchema,
  });
}

export function createBoard(workspaceId: string, input: CreateBoardInput) {
  return apiRequest(`/workspaces/${enc(workspaceId)}/boards`, {
    method: 'POST',
    body: input,
    schema: boardSchema,
  });
}

export function renameBoard(boardId: string, input: UpdateBoardInput) {
  return apiRequest(`/boards/${enc(boardId)}`, {
    method: 'PATCH',
    body: input,
    schema: boardSchema,
  });
}

export function deleteBoard(boardId: string) {
  return apiNoContent(`/boards/${enc(boardId)}`, { method: 'DELETE' });
}