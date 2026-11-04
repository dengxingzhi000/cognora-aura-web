"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import { QUERY_KEYS } from "@/constants/query-keys";
import { toApiError } from "@/lib/api/envelope";
import { notificationApiService } from "@/lib/api/services/notification";
import type { NotificationPreferenceDTO } from "@/lib/api/contracts/notification";

export function useNotificationPreferences(userId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATION.PREFERENCES(userId ?? ""),
    queryFn: () => notificationApiService.preferences.listByUser(userId as string),
    enabled: Boolean(userId),
  });
}

export interface TogglePreferenceInput {
  userId: string;
  notificationType: string;
  channel: string;
  enabled: boolean;
  /** The persisted row, when the preference already exists. */
  existing?: NotificationPreferenceDTO;
}

/**
 * The backend exposes plain create/update for preferences; there is no
 * dedicated toggle endpoint, so a missing row is created on first toggle.
 */
export function useSaveNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      notificationType,
      channel,
      enabled,
      existing,
    }: TogglePreferenceInput) => {
      if (existing?.id) {
        return notificationApiService.preferences.update({
          ...existing,
          enabled,
        });
      }
      return notificationApiService.preferences.create({
        userId,
        notificationType,
        channel,
        enabled,
      });
    },
    onSuccess: (_, variables) => {
      message.success("通知偏好已保存");
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.NOTIFICATION.PREFERENCES(variables.userId),
      });
    },
    onError: (error) => message.error(toApiError(error).message),
  });
}
