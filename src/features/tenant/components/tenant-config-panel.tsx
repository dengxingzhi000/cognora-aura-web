"use client";

import { useState } from "react";

import { BackendPendingNote } from "@/components/ui/backend-pending-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionGate } from "@/components/ui/permission-gate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmpty, TableLoading } from "@/components/ui/table-shell";
import { Textarea } from "@/components/ui/textarea";
import type { TenantConfigDTO } from "@/lib/api/contracts/tenant";
import { usePermission } from "@/hooks/use-permission";

import {
  useAllTenantConfigs,
  useDeleteConfig,
  useSaveConfig,
  useTenantConfigs,
} from "../hooks";
import { splitTenantConfigs } from "../lib/config-scope";

interface ConfigForm {
  configCategory: string;
  configKey: string;
  configValue: string;
  valueType: string;
  description: string;
}

const EMPTY_FORM: ConfigForm = {
  configCategory: "general",
  configKey: "",
  configValue: "",
  valueType: "string",
  description: "",
};

export function TenantConfigPanel({ tenantId }: { tenantId: string }) {
  const tenantQuery = useTenantConfigs(tenantId);
  const allQuery = useAllTenantConfigs();
  const save = useSaveConfig();
  const remove = useDeleteConfig();
  const { hasPermission } = usePermission();

  const canCreate = hasPermission("tenant:config:create");
  const canUpdate = hasPermission("tenant:config:update");
  const canDelete = hasPermission("tenant:config:delete");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TenantConfigDTO | null>(null);
  const [form, setForm] = useState<ConfigForm>(EMPTY_FORM);

  const { platform, tenant, others } = splitTenantConfigs(
    allQuery.data?.records,
    tenantId,
  );
  const tenantRows = tenantQuery.data?.records ?? tenant;
  const isLoading = tenantQuery.isLoading || allQuery.isLoading;

  const openEditor = (record: TenantConfigDTO | null) => {
    setEditing(record);
    setForm(
      record
        ? {
            configCategory: record.configCategory ?? "general",
            configKey: record.configKey ?? "",
            configValue: record.configValue ?? "",
            valueType: record.valueType ?? "string",
            description: record.description ?? "",
          }
        : EMPTY_FORM,
    );
    setOpen(true);
  };

  const submit = async () => {
    await save.mutateAsync({
      ...(editing ? { id: editing.id } : {}),
      tenantId,
      configCategory: form.configCategory.trim() || "general",
      configKey: form.configKey.trim(),
      configValue: form.configValue,
      valueType: form.valueType,
      description: form.description.trim() || null,
    });
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <BackendPendingNote>
        后端没有「只看平台级配置」的筛选参数，平台级配置按 `tenant_id` 为空在前端
        识别；本次返回中其他租户的 {others.length} 条配置已隐藏。
      </BackendPendingNote>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium">平台级默认配置</span>
          <Badge variant="secondary">平台级 · 只读</Badge>
        </div>
        <p className="text-muted-foreground text-[11px]">
          由平台维护，租户侧不可修改；租户覆盖项优先于平台默认值。
        </p>

        {isLoading ? (
          <TableLoading />
        ) : platform.length === 0 ? (
          <TableEmpty>暂无平台级配置</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分类</TableHead>
                <TableHead>配置键</TableHead>
                <TableHead className="min-w-[200px]">配置值</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platform.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.configCategory ?? "-"}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {item.configKey}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {item.configValue ?? "-"}
                  </TableCell>
                  <TableCell>{item.valueType ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.description ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium">租户覆盖配置</span>
            <Badge variant="info">可编辑</Badge>
          </div>
          <PermissionGate
            allowed={canCreate}
            reason="无权限：需要 tenant:config:create"
          >
            <Button size="sm" disabled={!canCreate} onClick={() => openEditor(null)}>
              新增覆盖项
            </Button>
          </PermissionGate>
        </div>
        <p className="text-muted-foreground text-[11px]">
          同名配置键的租户覆盖值优先于平台默认值；键在租户内唯一。
        </p>

        {isLoading ? (
          <TableLoading />
        ) : tenantRows.length === 0 ? (
          <TableEmpty>暂无租户覆盖配置</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分类</TableHead>
                <TableHead>配置键</TableHead>
                <TableHead className="min-w-[200px]">配置值</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>说明</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.configCategory ?? "-"}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {item.configKey}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {item.configValue ?? "-"}
                  </TableCell>
                  <TableCell>{item.valueType ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <PermissionGate
                      allowed={canUpdate}
                      reason="无权限：需要 tenant:config:update"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canUpdate}
                        onClick={() => openEditor(item)}
                      >
                        编辑
                      </Button>
                    </PermissionGate>
                    <PermissionGate
                      allowed={canDelete}
                      reason="无权限：需要 tenant:config:delete"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={!canDelete || remove.isPending}
                        onClick={() => remove.mutate(item.id)}
                      >
                        删除
                      </Button>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑租户覆盖配置" : "新增租户覆盖配置"}</DialogTitle>
            <DialogDescription>
              `valueType` 决定后端如何解析配置值（string / number / boolean / json）；
              保存后写入当前租户，不改动平台级默认值。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 text-[12px]">分类</Label>
              <Input
                value={form.configCategory}
                onChange={(event) =>
                  setForm({ ...form, configCategory: event.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 text-[12px]">配置键</Label>
              <Input
                value={form.configKey}
                onChange={(event) =>
                  setForm({ ...form, configKey: event.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 text-[12px]">值类型</Label>
              <Select
                value={form.valueType}
                onValueChange={(value) => setForm({ ...form, valueType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                  <SelectItem value="json">json</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-[12px]">配置值</Label>
              <Textarea
                rows={3}
                value={form.configValue}
                onChange={(event) =>
                  setForm({ ...form, configValue: event.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-[12px]">说明</Label>
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <PermissionGate
              allowed={editing ? canUpdate : canCreate}
              reason={`无权限：需要 ${
                editing ? "tenant:config:update" : "tenant:config:create"
              }`}
            >
              <Button
                disabled={
                  save.isPending || !form.configKey.trim() || !(editing ? canUpdate : canCreate)
                }
                onClick={submit}
              >
                {save.isPending ? "保存中…" : "保存"}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
