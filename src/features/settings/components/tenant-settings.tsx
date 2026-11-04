"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Pencil, Plus, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/envelope";
import type { TenantConfigDTO } from "@/lib/api/contracts/tenant";
import { tenantStatus } from "@/features/tenant/lib/format";
import { useTenantStore } from "@/stores/tenant-store";
import {
  useCurrentTenant,
  useSaveTenantConfig,
  useTenantConfigs,
  useUpdateCurrentTenant,
} from "../hooks";

const tenantSchema = z.object({
  tenantName: z.string().trim().min(1, "请输入租户名称").max(100, "最多 100 个字符"),
  tenantNameEn: z.string().trim().max(100, "最多 100 个字符"),
  contactName: z.string().trim().max(50, "最多 50 个字符"),
  contactPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^1[3-9]\d{9}$/.test(value), {
      message: "请输入 11 位手机号",
    }),
  contactEmail: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "请输入有效的邮箱地址",
    }),
  domain: z.string().trim().max(100, "最多 100 个字符"),
  address: z.string().trim().max(200, "最多 200 个字符"),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

function ConfigDialog({
  open,
  onOpenChange,
  tenantId,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editing: TenantConfigDTO | null;
}) {
  const save = useSaveTenantConfig();
  const [category, setCategory] = useState(editing?.configCategory ?? "system");
  const [key, setKey] = useState(editing?.configKey ?? "");
  const [value, setValue] = useState(editing?.configValue ?? "");
  const [valueType, setValueType] = useState(editing?.valueType ?? "STRING");
  const [description, setDescription] = useState(editing?.description ?? "");

  const submit = async () => {
    if (!key.trim() || !value.trim()) return;
    await save.mutateAsync({
      tenantId,
      existing: editing ?? undefined,
      values: {
        configCategory: category.trim() || "system",
        configKey: key.trim(),
        configValue: value.trim(),
        valueType: valueType.trim() || "STRING",
        description: description.trim() || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑租户配置" : "新增租户配置"}</DialogTitle>
          <DialogDescription>
            配置项写入当前租户；键与值不能为空。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">配置分类</label>
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="system"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">配置键</label>
            <Input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="例如 feature.enabled"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">配置值</label>
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="例如 true"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">值类型</label>
            <Input
              value={valueType}
              onChange={(event) => setValueType(event.target.value)}
              placeholder="STRING / NUMBER / BOOLEAN"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">描述</label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!key.trim() || !value.trim() || save.isPending}
            onClick={() => void submit()}
          >
            {save.isPending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantConfigList({
  tenantId,
  canCreate,
  canUpdate,
}: {
  tenantId: string;
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const { data, isLoading, isError, error, refetch } = useTenantConfigs(tenantId);
  const [editing, setEditing] = useState<TenantConfigDTO | null>(null);
  const [open, setOpen] = useState(false);

  const rows = data?.records ?? [];

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (config: TenantConfigDTO) => {
    setEditing(config);
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">租户配置项</p>
        {canCreate && (
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-3.5" />
            新增配置
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border py-6 text-center">
          <p className="text-sm font-medium">租户配置加载失败</p>
          <p className="text-muted-foreground text-xs">{toApiError(error).message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
        </div>
      ) : !rows.length ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-xs">
          当前租户暂无配置项{canCreate ? "，可通过「新增配置」创建第一条。" : "。"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs">
                <th className="py-2 pr-3 text-left font-medium">分类</th>
                <th className="py-2 pr-3 text-left font-medium">配置键</th>
                <th className="py-2 pr-3 text-left font-medium">配置值</th>
                <th className="py-2 pr-3 text-left font-medium">类型</th>
                <th className="py-2 pr-3 text-left font-medium">描述</th>
                {canUpdate && (
                  <th className="py-2 text-right font-medium">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((config) => (
                <tr key={config.id} className="border-border border-b last:border-b-0">
                  <td className="py-2.5 pr-3">{config.configCategory || "—"}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs">
                    {config.configKey || "—"}
                  </td>
                  <td className="max-w-[220px] truncate py-2.5 pr-3">
                    {config.configValue || "—"}
                  </td>
                  <td className="py-2.5 pr-3">{config.valueType || "—"}</td>
                  <td className="text-muted-foreground max-w-[220px] truncate py-2.5 pr-3 text-xs">
                    {config.description || "—"}
                  </td>
                  {canUpdate && (
                    <td className="py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(config)}
                      >
                        <Pencil className="size-3.5" />
                        编辑
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfigDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        tenantId={tenantId}
        editing={editing}
      />
    </div>
  );
}

export default function TenantSettings({
  canView,
  canUpdate,
  canConfigPage,
  canConfigCreate,
  canConfigUpdate,
}: {
  canView: boolean;
  canUpdate: boolean;
  canConfigPage: boolean;
  canConfigCreate: boolean;
  canConfigUpdate: boolean;
}) {
  const tenantId = useTenantStore((state) => state.currentTenant?.id);
  const { data, isLoading, isError, error, refetch } = useCurrentTenant({
    enabled: canView,
  });
  const updateTenant = useUpdateCurrentTenant();

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    values: {
      tenantName: data?.tenantName ?? "",
      tenantNameEn: data?.tenantNameEn ?? "",
      contactName: data?.contactName ?? "",
      contactPhone: data?.contactPhone ?? "",
      contactEmail: data?.contactEmail ?? "",
      domain: data?.domain ?? "",
      address: data?.address ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await updateTenant.mutateAsync({
      tenantName: values.tenantName,
      tenantNameEn: values.tenantNameEn || undefined,
      contactName: values.contactName || undefined,
      contactPhone: values.contactPhone || undefined,
      contactEmail: values.contactEmail || undefined,
      domain: values.domain || undefined,
      address: values.address || undefined,
    });
  });

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-6 text-sm">
          当前账号没有 tenant:tenant:view 权限，租户设置暂未开放。
        </CardContent>
      </Card>
    );
  }

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-6 text-sm">
          当前会话没有选择租户，无法加载租户设置。
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium">租户信息加载失败</p>
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

  const status = tenantStatus(data.status);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            当前租户
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardTitle>
          <CardDescription>
            {data.tenantCode} · 数据来自 GET /scm-tenant/tenant/{"{id}"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="tenant-settings-form"
              onSubmit={onSubmit}
              className="grid gap-3 sm:grid-cols-2"
            >
              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>租户名称</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tenantNameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>英文名称</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系人</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系电话</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系邮箱</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>绑定域名</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>联系地址</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canUpdate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          {canUpdate ? (
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" form="tenant-settings-form" disabled={updateTenant.isPending}>
                {updateTenant.isPending ? "保存中…" : "保存租户设置"}
              </Button>
              <span className="text-muted-foreground text-xs">
                修改通过 PUT /scm-tenant/tenant 提交。
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground mt-4 text-xs">
              当前账号没有 tenant:tenant:update 权限，字段为只读。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            租户配置
          </CardTitle>
          <CardDescription>
            按分类与键维护当前租户的配置项；接口为 /scm-tenant/tenant-config。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canConfigPage ? (
            <TenantConfigList
              tenantId={tenantId}
              canCreate={canConfigCreate}
              canUpdate={canConfigUpdate}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              当前账号没有 tenant:config:page 权限，租户配置暂未开放。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
