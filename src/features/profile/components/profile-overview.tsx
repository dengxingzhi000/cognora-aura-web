"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, IdCard, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

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
  DialogTrigger,
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
import { usePermission } from "@/hooks/use-permission";
import { useUpdateProfile, useProfile } from "../hooks";

const profileSchema = z.object({
  realName: z
    .string()
    .trim()
    .min(2, "姓名至少 2 个字符")
    .max(50, "姓名最多 50 个字符"),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "请输入有效的邮箱地址",
    }),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^1[3-9]\d{9}$/.test(value), {
      message: "请输入 11 位手机号",
    }),
  avatar: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), {
      message: "请输入以 http(s):// 开头的图片地址",
    }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const initials = (value: string) =>
  value.trim().slice(0, 1).toUpperCase() || "U";

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
}) => (
  <div className="flex items-start gap-3 py-2.5">
    <span className="bg-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
      <Icon className="text-muted-foreground size-3.5" />
    </span>
    <div className="min-w-0">
      <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground truncate text-sm">{value || "未填写"}</p>
    </div>
  </div>
);

export default function ProfileOverview() {
  const locale = useLocale();
  const { hasPermission } = usePermission();
  const { data, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const [open, setOpen] = useState(false);

  const canEdit = hasPermission("system:user:edit");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      realName: data?.realName ?? data?.username ?? "",
      email: data?.email ?? "",
      phone: data?.phone ?? "",
      avatar: data?.avatar ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!data) return;
    await updateProfile.mutateAsync({
      userId: data.userId,
      values: {
        realName: values.realName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        avatar: values.avatar || undefined,
      },
    });
    setOpen(false);
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium">个人资料加载失败</p>
          <p className="text-muted-foreground max-w-md text-xs">
            {toApiError(error).message}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-7 text-center">
          {data.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatar}
              alt={data.realName || data.username}
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-xl font-semibold">
              {initials(data.realName || data.username)}
            </div>
          )}
          <div>
            <p className="text-base font-semibold">{data.realName || data.username}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">@{data.username}</p>
          </div>
          {data.roles?.length ? (
            <div className="flex flex-wrap justify-center gap-1.5">
              {data.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">未分配角色</p>
          )}
          {canEdit ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="mt-1">
                  编辑资料
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>编辑个人资料</DialogTitle>
                  <DialogDescription>
                    通过用户更新接口修改头像、姓名与联系方式。
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={onSubmit} className="space-y-3">
                    <FormField
                      control={form.control}
                      name="realName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>姓名</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="请输入姓名" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>邮箱</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="name@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>手机号</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="11 位手机号" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>头像地址</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        取消
                      </Button>
                      <Button type="submit" disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? "保存中…" : "保存"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">
              资料编辑需要 system:user:edit 权限，当前账号暂无。
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>基本资料</CardTitle>
            <CardDescription>
              数据来自登录用户信息接口（GET /auth/api/auth/userinfo）。
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-border grid gap-x-6 divide-y sm:grid-cols-2">
            <InfoRow icon={IdCard} label="用户名" value={data.username} />
            <InfoRow icon={Mail} label="邮箱" value={data.email} />
            <InfoRow icon={Phone} label="手机号" value={data.phone} />
            <InfoRow icon={MapPin} label="所属部门" value={data.deptName} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={`/${locale}/settings/security`}
            className="bg-card hover:bg-[var(--color-bg-hover)] group flex items-center justify-between rounded-xl border px-4 py-3 transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <ShieldCheck className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">账号安全</span>
                <span className="text-muted-foreground block text-xs">
                  修改密码、查看通行密钥
                </span>
              </span>
            </span>
            <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href={`/${locale}/settings/notifications`}
            className="bg-card hover:bg-[var(--color-bg-hover)] group flex items-center justify-between rounded-xl border px-4 py-3 transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <Mail className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">通知偏好</span>
                <span className="text-muted-foreground block text-xs">
                  按类型与渠道控制提醒
                </span>
              </span>
            </span>
            <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
