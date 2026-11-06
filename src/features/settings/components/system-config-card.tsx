"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Pencil, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/use-permission";
import { isEndpointUnavailable } from "@/lib/api/availability";
import { toApiError } from "@/lib/api/envelope";
import type { SystemConfigDTO } from "@/lib/api/contracts/system";
import { useSaveSystemConfig, useSystemConfigs } from "../hooks";
import {
  resolveConfigSource,
  validateConfigValue,
} from "../lib/system-config";
import { UnavailableCard } from "./unavailable-card";

const formatTime = (value: string | undefined, locale: string) =>
  value ? new Date(value).toLocaleString(locale) : "—";

function ConfigValue({ config }: { config: SystemConfigDTO }) {
  const valueType = config.valueType ?? "STRING";

  if (valueType === "BOOLEAN") {
    return (
      <Badge variant={config.configValue === "true" ? "success" : "secondary"}>
        {config.configValue === "true" ? "启用" : "停用"}
      </Badge>
    );
  }

  if (valueType === "JSON") {
    return (
      <code className="bg-sunken text-muted-foreground block max-w-[260px] truncate rounded px-1.5 py-0.5 text-[11px]">
        {config.configValue}
      </code>
    );
  }

  return (
    <span className="block max-w-[220px] truncate font-mono text-xs">
      {config.configValue}
    </span>
  );
}

function ConfigEditDialog({
  config,
  onClose,
}: {
  config: SystemConfigDTO;
  onClose: () => void;
}) {
  const valueType = config.valueType ?? "STRING";
  const save = useSaveSystemConfig();
  const [value, setValue] = useState(config.configValue);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const validation = validateConfigValue(valueType, value);
    if (validation) {
      setError(validation);
      return;
    }

    try {
      await save.mutateAsync({
        configKey: config.configKey,
        configValue: value,
        valueType,
        description: config.description,
        isPublic: config.isPublic,
        scope: "TENANT",
      });
      onClose();
    } catch {
      // The mutation hook already surfaced the server message.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑租户覆盖值</DialogTitle>
          <DialogDescription>
            仅修改当前租户的覆盖值，平台级默认值不受影响。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">配置键</label>
            <Input value={config.configKey} disabled />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">配置值（{valueType}）</label>
            {valueType === "BOOLEAN" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value === "true"}
                  onCheckedChange={(checked) => {
                    setValue(checked ? "true" : "false");
                    setError(null);
                  }}
                />
                {value === "true" ? "启用" : "停用"}
              </label>
            ) : valueType === "JSON" ? (
              <Textarea
                rows={6}
                value={value}
                className="font-mono text-xs"
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
              />
            ) : (
              <Input
                type={valueType === "NUMBER" ? "number" : "text"}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
              />
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>

          {config.description && (
            <p className="text-muted-foreground text-xs">{config.description}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={save.isPending} onClick={() => void submit()}>
            {save.isPending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SystemConfigCard() {
  const locale = useLocale();
  const { hasPermission } = usePermission();
  const canView = hasPermission("system:config:view");
  const canEdit = hasPermission("system:config:edit");
  const { data, isLoading, isError, error, refetch } = useSystemConfigs({
    enabled: canView,
  });
  const [editing, setEditing] = useState<SystemConfigDTO | null>(null);

  if (!canView) {
    return (
      <UnavailableCard
        title="系统参数"
        reason="当前账号没有 system:config:view 权限，无法查看平台参数。"
      />
    );
  }

  if (isError && isEndpointUnavailable(error)) {
    return (
      <UnavailableCard
        title="系统参数"
        reason="后端尚未上线系统参数接口，暂时无法读取或维护全局参数。"
        needed="GET /api/system/config、PUT /api/system/config"
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            系统参数
          </CardTitle>
          <CardDescription>正在加载平台参数与租户覆盖。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm font-medium">系统参数加载失败</p>
          <p className="text-muted-foreground text-xs">
            {toApiError(error).message}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          系统参数
        </CardTitle>
        <CardDescription>
          平台级参数对所有租户生效且只读；租户覆盖仅作用于当前租户
          {canEdit ? "，可在下方编辑。" : "，当前账号没有编辑权限，全部为只读。"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-xs">
            暂无可展示的系统参数。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs">
                  <th className="py-2 pr-3 text-left font-medium">配置键</th>
                  <th className="py-2 pr-3 text-left font-medium">配置值</th>
                  <th className="py-2 pr-3 text-left font-medium">类型</th>
                  <th className="py-2 pr-3 text-left font-medium">来源</th>
                  <th className="py-2 pr-3 text-left font-medium">说明</th>
                  <th className="py-2 pr-3 text-left font-medium">更新时间</th>
                  {canEdit && (
                    <th className="py-2 text-right font-medium">操作</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((config) => {
                  const source = resolveConfigSource(config);
                  return (
                    <tr
                      key={`${source}-${config.configKey}`}
                      className="border-border border-b last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {config.configKey}
                      </td>
                      <td className="max-w-[220px] py-2.5 pr-3">
                        <ConfigValue config={config} />
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-3 text-xs">
                        {config.valueType ?? "STRING"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {source === "tenant" ? (
                          <Badge variant="info">租户覆盖</Badge>
                        ) : (
                          <Badge variant="secondary">平台级</Badge>
                        )}
                      </td>
                      <td className="text-muted-foreground max-w-[220px] truncate py-2.5 pr-3 text-xs">
                        {config.description || "—"}
                      </td>
                      <td className="text-muted-foreground py-2.5 pr-3 text-xs">
                        {source === "tenant"
                          ? formatTime(config.updateTime, locale)
                          : "—"}
                      </td>
                      {canEdit && (
                        <td className="py-2.5 text-right">
                          {source === "tenant" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(config)}
                            >
                              <Pencil className="size-3.5" />
                              编辑
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              只读
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {editing && (
        <ConfigEditDialog
          key={editing.configKey}
          config={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}
