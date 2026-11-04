import apiClient from "../client";
import { unwrap } from "../envelope";
import type {
  NotificationPreferenceDTO,
  NotificationPreferenceList,
  NotificationPreferencePage,
  UserNotificationPage,
  UserNotificationQuery,
} from "../contracts/notification";

const NOTIFICATION_BASE = "/scm-notify/sys-user-notification";
const PREFERENCE_BASE = "/scm-notify/sys-user-notification-preference";

const get = <T>(url: string, params?: object) =>
  unwrap<T>(apiClient.get(url, { params }));

const post = <T>(url: string, data?: unknown) =>
  unwrap<T>(apiClient.post(url, data));

const put = <T>(url: string, data?: unknown) =>
  unwrap<T>(apiClient.put(url, data));

const putWithParams = <T>(url: string, params?: object) =>
  unwrap<T>(apiClient.put(url, undefined, { params }));

const del = <T>(url: string, params?: object) =>
  unwrap<T>(apiClient.delete(url, { params }));

export const notificationApiService = {
  page: (query: UserNotificationQuery) =>
    get<UserNotificationPage>(`${NOTIFICATION_BASE}/page`, query),
  unreadCount: () => get<number>(`${NOTIFICATION_BASE}/unread-count`),
  markAsRead: (id: string) =>
    putWithParams<boolean>(`${NOTIFICATION_BASE}/${id}/read`),
  markAllAsRead: () => putWithParams<boolean>(`${NOTIFICATION_BASE}/read-all`),
  remove: (id: string) => del<boolean>(`${NOTIFICATION_BASE}/${id}`),
  removeMany: (ids: string[]) =>
    del<number>(NOTIFICATION_BASE, { ids: ids.join(",") }),

  preferences: {
    listByUser: (userId: string) =>
      get<NotificationPreferenceList>(`${PREFERENCE_BASE}/user/${userId}`),
    page: (query: {
      page: number;
      size: number;
      notificationType?: string;
      channel?: string;
    }) => get<NotificationPreferencePage>(`${PREFERENCE_BASE}/page`, query),
    create: (entity: NotificationPreferenceDTO) =>
      post<NotificationPreferenceDTO>(PREFERENCE_BASE, entity),
    update: (entity: NotificationPreferenceDTO) =>
      put<NotificationPreferenceDTO>(PREFERENCE_BASE, entity),
    remove: (id: string) => del<boolean>(`${PREFERENCE_BASE}/${id}`),
  },
};
