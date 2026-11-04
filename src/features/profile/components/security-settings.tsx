"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, MonitorSmartphone, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { WebAuthnCredentialDTO } from "@/lib/api/contracts/auth";
import {
  useChangePassword,
  useDeletePasskey,
  useDeactivatePasskey,
  usePasskeys,
  useRenamePasskey,
} from "../hooks";

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z
      .string()
      .min(8, "新密码至少 8 位")
      .max(64, "新密码最多 64 位")
      .regex(/[A-Za-z]/, "新密码需包含字母")
      .regex(/\d/, "新密码需包含数字"),
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的新密码不一致",
  })
  .refine((values) => values.oldPassword !== values.newPassword, {
    path: ["newPassword"],
    message: "新密码不能与当前密码相同",
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const formatTime = (value: string | null | undefined, locale: string) =>
  value ? new Date(value).toLocaleString(locale) : "—";

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await changePassword.mutateAsync({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
    form.reset();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" />
          修改密码
        </CardTitle>
        <CardDescription>
          修改后当前登录状态保持不变；如需让其他设备重新登录，需后端提供会话管理接口。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>当前密码</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" autoComplete="new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认新密码</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" autoComplete="new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "提交中…" : "修改密码"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PasskeyCard() {
  const locale = useLocale();
  const { data, isLoading, isError, error, refetch } = usePasskeys();
  const renamePasskey = useRenamePasskey();
  const deactivatePasskey = useDeactivatePasskey();
  const deletePasskey = useDeletePasskey();

  const [renaming, setRenaming] = useState<WebAuthnCredentialDTO | null>(null);
  const [deleting, setDeleting] = useState<WebAuthnCredentialDTO | null>(null);
  const [name, setName] = useState("");

  const openRename = (credential: WebAuthnCredentialDTO) => {
    setRenaming(credential);
    setName(credential.deviceName ?? "");
  };

  const submitRename = async () => {
    if (!renaming || !name.trim()) return;
    await renamePasskey.mutateAsync({ id: renaming.credentialId, name: name.trim() });
    setRenaming(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="size-4" />
          通行密钥（登录设备凭证）
        </CardTitle>
        <CardDescription>
          后端仅提供 WebAuthn 凭证列表，没有登录会话列表；这里展示已绑定到账号的安全密钥。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm font-medium">通行密钥加载失败</p>
            <p className="text-muted-foreground text-xs">
              {toApiError(error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : !data?.length ? (
          <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-xs">
            尚未绑定任何通行密钥。绑定需要浏览器 WebAuthn 注册流程，本页仅提供查看与管理。
          </div>
        ) : (
          <div className="divide-border divide-y">
            {data.map((credential) => (
              <div
                key={credential.credentialId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {credential.deviceName || "未命名设备"}
                    <Badge variant={credential.isActive ? "secondary" : "outline"}>
                      {credential.isActive ? "启用中" : "已停用"}
                    </Badge>
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    添加于 {formatTime(credential.createdTime, locale)} · 最近使用{" "}
                    {formatTime(credential.lastUsedAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openRename(credential)}
                  >
                    重命名
                  </Button>
                  {credential.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deactivatePasskey.isPending}
                      onClick={() =>
                        deactivatePasskey.mutate(credential.credentialId)
                      }
                    >
                      停用
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(credential)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重命名通行密钥</DialogTitle>
            <DialogDescription>仅修改本地显示名称，不影响凭证本身。</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：办公室 MacBook"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              取消
            </Button>
            <Button
              disabled={!name.trim() || renamePasskey.isPending}
              onClick={() => void submitRename()}
            >
              {renamePasskey.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="删除通行密钥"
        description="删除后该设备将无法再使用此密钥登录，且无法恢复。"
        confirmText="删除"
        destructive
        pending={deletePasskey.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void deletePasskey
            .mutateAsync(deleting.credentialId)
            .then(() => setDeleting(null));
        }}
      />
    </Card>
  );
}

export default function SecuritySettings() {
  return (
    <div className="space-y-4">
      <ChangePasswordCard />
      <PasskeyCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="size-4" />
            登录会话 / 退出其他设备
          </CardTitle>
          <CardDescription>暂未开放</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 text-xs">
          <p>
            后端目前只有管理员接口
            「POST /auth/api/auth/force-logout/{"{userId}"}」（需
            「system:user:edit」），没有面向当前用户的会话列表与「退出其他设备」接口。
          </p>
          <p>
            需要的后端端点：「GET /api/auth/sessions」、
            「DELETE /api/auth/sessions/{"{sessionId}"}」。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
