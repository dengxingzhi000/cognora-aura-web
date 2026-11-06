"use client";

import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 无权限时保持按钮置灰，并通过可聚焦容器展示「缺哪个权限码」的原因。
 * 权限码必须与后端 `@PreAuthorize` 使用的权限码完全一致。
 */
export function PermissionGate({
  allowed,
  reason,
  children,
}: {
  allowed: boolean;
  reason: string;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-block cursor-not-allowed">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
