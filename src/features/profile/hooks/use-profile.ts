"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import { QUERY_KEYS } from "@/constants/query-keys";
import { toApiError } from "@/lib/api/envelope";
import { authService } from "@/lib/api/services/auth";
import { systemService } from "@/lib/api/services/system";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SelfProfileUpdateRequest } from "@/lib/api/contracts/system";

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

/** Profile fields come from `GET /auth/api/auth/userinfo` — the only self-service read endpoint. */
export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.INFO,
    queryFn: () => authService.getUserInfo(),
    staleTime: 60_000,
  });
}

/**
 * Self-service profile update. The whitelisted fields go to
 * `PUT /api/system/users/me`, which every signed-in user may call — no
 * `system:user:edit` required.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SelfProfileUpdateRequest) =>
      systemService.users.updateMe(values),
    onSuccess: (_, values) => {
      message.success("资料已更新");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.INFO });

      const { user, setUser } = useAuthStore.getState();
      if (user) {
        setUser({
          ...user,
          displayName: values.realName ?? user.displayName,
          email: values.email ?? user.email,
          avatar: values.avatar ?? user.avatar,
        });
      }
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}

/** Active login sessions. Not deployed yet — 404 degrades to「暂不可用」. */
export function useLoginSessions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.SESSIONS,
    queryFn: () => authService.sessions.list(),
    retry: false,
    enabled: options?.enabled ?? true,
  });
}

export function useLogoutOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.sessions.logoutOthers(),
    onSuccess: (result) => {
      const count = result?.revokedCount;
      message.success(
        count
          ? `已退出 ${count} 个其他设备，当前设备的登录已保留`
          : "已退出其他设备，当前设备的登录已保留"
      );
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PROFILE.SESSIONS,
      });
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
