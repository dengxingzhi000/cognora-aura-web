"use client";

import { useLocale } from "next-intl";
import { Layers, Settings2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermission } from "@/hooks/use-permission";
import DictionarySummary from "./dictionary-summary";
import TenantSettings from "./tenant-settings";
import { UnavailableCard } from "./unavailable-card";

export default function SystemSettings() {
  const locale = useLocale();
  const { hasPermission } = usePermission();

  const canDict = hasPermission("system:dict:list");
  const canTenantView = hasPermission("tenant:tenant:view");
  const canTenantUpdate = hasPermission("tenant:tenant:update");
  const canConfigPage = hasPermission("tenant:config:page");
  const canConfigCreate = hasPermission("tenant:config:create");
  const canConfigUpdate = hasPermission("tenant:config:update");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4" />
            平台级设置
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            影响整个平台实例的配置，通常需要平台管理员权限。
          </p>
        </div>

        <UnavailableCard
          title="系统参数"
          reason="后端没有 sys-config 类端点，无法读取或维护全局参数。"
          needed="GET /api/system/config、PUT /api/system/config"
        />

        {canDict ? (
          <DictionarySummary href={`/${locale}/system/dictionary`} />
        ) : (
          <UnavailableCard
            title="字典管理"
            reason="当前账号没有 system:dict:list 权限，无法查看字段字典。"
          />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4" />
            租户级设置
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            仅作用于当前租户；无权限的模块会显示为暂未开放。
          </p>
        </div>

        <TenantSettings
          canView={canTenantView}
          canUpdate={canTenantUpdate}
          canConfigPage={canConfigPage}
          canConfigCreate={canConfigCreate}
          canConfigUpdate={canConfigUpdate}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>权限说明</CardTitle>
          <CardDescription>
            以下权限码取自后端接口覆盖脚本，页面对每个入口都做了前置判断，不会渲染必定 403 的按钮。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
          <p>字典：system:dict:list</p>
          <p>租户查看：tenant:tenant:view</p>
          <p>租户更新：tenant:tenant:update</p>
          <p>租户配置：tenant:config:page / create / update</p>
        </CardContent>
      </Card>
    </div>
  );
}
