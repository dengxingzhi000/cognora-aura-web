import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 后端能力缺口的显式标注：用于「后端接口尚未上线」的降级区域。
 * 不要用这个组件掩盖可用的功能，也不要伪造接口路径。
 */
export function BackendPendingNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-md border border-border px-3 py-2 text-[11px]",
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <span className="text-foreground font-medium">待后端上线</span>：
        {children}
      </span>
    </div>
  );
}
