'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateBoardInput,
  CreateWorkspaceInput,
  UpdateBoardInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
} from '@kompak/shared';
import * as api from '@/lib/api/workspaces';

export const workspacesKey = ['workspaces'] as const;
export const workspaceKey = (workspaceId: string) =>
  ['workspace', workspaceId] as const;
export const membersKey = (workspaceId: string) =>
  ['workspace', workspaceId, 'members'] as const;
export const boardsKey = (workspaceId: string) =>
  ['workspace', workspaceId, 'boards'] as const;
export const invitePreviewKey = (code: string) => ['invite', code] as const;

export function useWorkspaces() {
  return useQuery({ queryKey: workspacesKey, queryFn: api.listWorkspaces });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKey(workspaceId),
    queryFn: () => api.getWorkspace(workspaceId),
  });
}

export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: membersKey(workspaceId),
    queryFn: () => api.listMembers(workspaceId),
  });
}

export function useBoards(workspaceId: string) {
  return useQuery({
    queryKey: boardsKey(workspaceId),
    queryFn: () => api.listBoards(workspaceId),
  });
}

export function useInvitePreview(code: string) {
  return useQuery({
    queryKey: invitePreviewKey(code),
    queryFn: () => api.getInvitePreview(code),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => api.createWorkspace(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
  });
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      workspaceId: string;
      input: UpdateWorkspaceInput;
    }) => api.renameWorkspace(variables.workspaceId, variables.input),
    onSuccess: async (_result, { workspaceId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: workspacesKey }),
      ]);
    },
  });
}

// Setelah dihapus atau ditinggalkan, hanya daftar kelompok yang disegarkan:
// menyegarkan kelompok itu sendiri akan menghasilkan 404 sesaat sebelum pindah halaman.
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => api.deleteWorkspace(workspaceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
  });
}

export function useLeaveWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { workspaceId: string; userId: string }) =>
      api.removeMember(variables.workspaceId, variables.userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
  });
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      workspaceId: string;
      userId: string;
      role: UpdateMemberRoleInput['role'];
    }) => api.changeMemberRole(variables.workspaceId, variables.userId, variables.role),
    onSuccess: (_result, { workspaceId }) =>
      queryClient.invalidateQueries({ queryKey: membersKey(workspaceId) }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { workspaceId: string; userId: string }) =>
      api.removeMember(variables.workspaceId, variables.userId),
    onSuccess: async (_result, { workspaceId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: workspacesKey }),
      ]);
    },
  });
}

export function useRegenerateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => api.regenerateInvite(workspaceId),
    onSuccess: (_result, workspaceId) =>
      queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceId) }),
  });
}

export function useJoinWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.joinWorkspace(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { workspaceId: string; input: CreateBoardInput }) =>
      api.createBoard(variables.workspaceId, variables.input),
    onSuccess: async (_result, { workspaceId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardsKey(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: workspacesKey }),
      ]);
    },
  });
}

export function useRenameBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      boardId: string;
      workspaceId: string;
      input: UpdateBoardInput;
    }) => api.renameBoard(variables.boardId, variables.input),
    onSuccess: (_result, { workspaceId }) =>
      queryClient.invalidateQueries({ queryKey: boardsKey(workspaceId) }),
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { boardId: string; workspaceId: string }) =>
      api.deleteBoard(variables.boardId),
    onSuccess: async (_result, { workspaceId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardsKey(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: workspacesKey }),
      ]);
    },
  });
}