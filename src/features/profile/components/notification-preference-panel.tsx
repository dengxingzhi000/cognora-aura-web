"use client";

import { BellRing, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api/envelope";
import { useNotificationPreferences, useSaveNotificationPreference, useProfile } from "../hooks";

/**
 * Notification types combine the codes used by the notification list
 * (`SYSTEM|ORDER|INVENTORY|APPROVAL|SECURITY`) with `MARKETING`, which the
 * `sys_user_notification_preference` column comment also documents.
 */
const TYPES = [
  { code: "SYSTEM", label: "系统通知" },
  { code: "ORDER", label: "订单动态" },
  { code: "INVENTORY", label: "库存预警" },
  { code: "APPROVAL", label: "审批待办" },
  { code: "SECURITY", label: "安全提醒" },
  { code: "MARKETING", label: "营销消息" },
] as const;

/** Channel codes come from the `notify_channel` dictionary seed. */
const CHANNELS = [
  { code: "EMAIL", label: "邮件" },
  { code: "SMS", label: "短信" },
  { code: "DINGTALK", label: "钉钉" },
  { code: "WECOM", label: "企业微信" },
  { code: "WEBHOOK", label: "Webhook" },
] as const;

export default function NotificationPreferencePanel() {
  const profile = useProfile();
  const userId = profile.data?.userId;
  const { data, isLoading, isError, error, refetch } =
    useNotificationPreferences(userId);
  const save = useSaveNotificationPreference();

  const preferences = data ?? [];
  const find = (notificationType: string, channel: string) =>
    preferences.find(
      (item) =>
        item.notificationType === notificationType && item.channel === channel,
    );

  if (profile.isLoading || isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (profile.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium">无法获取当前用户</p>
          <p className="text-muted-foreground text-xs">
            {toApiError(profile.error).message}
          </p>
          <Button variant="outline" size="sm" onClick={() => void profile.refetch()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium">通知偏好加载失败</p>
          <p className="text-muted-foreground text-xs">{toApiError(error).message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" />
            消息通知偏好
          </CardTitle>
          <CardDescription>
            勾选即创建/更新一条偏好记录；未勾选表示没有显式启用，由后端默认策略决定。
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground py-2 pr-4 text-left text-xs font-medium">
                  通知类型
                </th>
                {CHANNELS.map((channel) => (
                  <th
                    key={channel.code}
                    className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
                  >
                    {channel.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPES.map((type) => (
                <tr key={type.code} className="border-border border-b last:border-b-0">
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-muted-foreground text-[11px]">{type.code}</p>
                  </td>
                  {CHANNELS.map((channel) => {
                    const existing = find(type.code, channel.code);
                    return (
                      <td key={channel.code} className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Checkbox
                            checked={Boolean(existing?.enabled)}
                            disabled={save.isPending}
                            aria-label={`${type.label} ${channel.label}`}
                            onCheckedChange={(checked) =>
                              save.mutate({
                                userId: userId as string,
                                notificationType: type.code,
                                channel: channel.code,
                                enabled: checked === true,
                                existing,
                              })
                            }
                          />
                          {existing?.quietHoursStart || existing?.quietHoursEnd ? (
                            <span className="text-muted-foreground text-[10px]">
                              {existing.quietHoursStart?.slice(11, 16) || "—"}–
                              {existing.quietHoursEnd?.slice(11, 16) || "—"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="text-muted-foreground flex items-start gap-2 rounded-lg border border-dashed px-4 py-3 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          免打扰时段（quietHoursStart / quietHoursEnd）可展示但暂不可编辑：后端把 TIME
          列映射为 LocalDateTime，直接提交时间会因类型不匹配失败。
        </p>
      </div>
    </div>
  );
}
