'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@kompak/shared';
import {
  forgotPassword,
  login,
  logout,
  register,
  requestRegistrationCode,
  resetPassword,
  restoreSession,
} from '@/lib/api/auth';

export const SESSION_QUERY_KEY = ['session'] as const;

// Membuang semua data kecuali sesi, agar data satu pengguna tidak terbawa ke pengguna lain.
function clearUserData(queryClient: QueryClient): void {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
  });
}

export function useSession() {
  return useQuery<AuthUser | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: restoreSession,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (user) => {
      clearUserData(queryClient);
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export function useRequestRegistrationCodeMutation() {
  return useMutation({
    mutationFn: (email: string) => requestRegistrationCode(email),
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (user) => {
      clearUserData(queryClient);
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      clearUserData(queryClient);
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    },
  });
}