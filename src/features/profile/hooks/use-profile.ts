"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import { QUERY_KEYS } from "@/constants/query-keys";
import { toApiError } from "@/lib/api/envelope";
import { authService } from "@/lib/api/services/auth";
import { systemService } from "@/lib/api/services/system";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserDTO } from "@/lib/api/contracts/system";

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  userId: string;
  values: Partial<UserDTO>;
}

/** Profile fields come from `GET /auth/api/auth/userinfo` — the only self-service read endpoint. */
export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.INFO,
    queryFn: () => authService.getUserInfo(),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, values }: UpdateProfileInput) =>
      systemService.users.update(userId, values),
    onSuccess: (_, variables) => {
      message.success("资料已更新");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.INFO });

      const { user, setUser } = useAuthStore.getState();
      if (user) {
        setUser({
          ...user,
          displayName:
            (variables.values.realName as string | undefined) ?? user.displayName,
          email: (variables.values.email as string | undefined) ?? user.email,
          avatar: (variables.values.avatar as string | undefined) ?? user.avatar,
        });
      }
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      systemService.users.changePassword({
        oldPassword: input.oldPassword,
        newPassword: input.newPassword,
      }),
    onSuccess: () => message.success("密码已修改"),
    onError: (error) => message.error(toApiError(error).message),
  });
}

/** WebAuthn credentials are the only device-bound security artefact the backend exposes. */
export function usePasskeys() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.PASSKEYS,
    queryFn: () => authService.webauthn.listCredentials(),
  });
}

export function useRenamePasskey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      authService.webauthn.updateDeviceName(id, name),
    onSuccess: () => {
      message.success("已重命名");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.PASSKEYS });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}

export function useDeactivatePasskey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => authService.webauthn.deactivateCredential(id),
    onSuccess: () => {
      message.success("已停用该通行密钥");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.PASSKEYS });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}

export function useDeletePasskey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => authService.webauthn.deleteCredential(id),
    onSuccess: () => {
      message.success("已删除");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.PASSKEYS });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}
