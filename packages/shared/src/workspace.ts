import { z } from 'zod';

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export const workspaceRoleSchema = z.enum(WORKSPACE_ROLES);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

const nameSchema = z.string().trim().min(1).max(100);

export const createWorkspaceSchema = z.object({ name: nameSchema });
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({ name: nameSchema });
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

// Peran OWNER tidak bisa diberikan lewat API (belum ada pemindahan kepemilikan).
export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const createBoardSchema = z.object({ name: nameSchema });
export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const updateBoardSchema = z.object({ name: nameSchema });
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

export const inviteCodeSchema = z.string().trim().toUpperCase().min(1).max(32);

export const workspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: workspaceRoleSchema,
  memberCount: z.number().int(),
  boardCount: z.number().int(),
});
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;

export const workspaceDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: workspaceRoleSchema,
  inviteCode: z.string(),
  createdAt: z.string(),
});
export type WorkspaceDetail = z.infer<typeof workspaceDetailSchema>;

export const memberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: workspaceRoleSchema,
  joinedAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const invitePreviewSchema = z.object({
  workspaceName: z.string(),
  memberCount: z.number().int(),
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;

export const joinResponseSchema = z.object({ workspaceId: z.string() });
export type JoinResponse = z.infer<typeof joinResponseSchema>;

export const inviteCodeResponseSchema = z.object({ inviteCode: z.string() });
export type InviteCodeResponse = z.infer<typeof inviteCodeResponseSchema>;

export const boardSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  createdAt: z.string(),
});
export type Board = z.infer<typeof boardSchema>;

export const workspaceSummaryListSchema = z.array(workspaceSummarySchema);
export const memberListSchema = z.array(memberSchema);
export const boardListSchema = z.array(boardSchema);