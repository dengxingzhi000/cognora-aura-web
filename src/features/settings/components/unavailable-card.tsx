import { CircleSlash } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function UnavailableCard({
  title,
  reason,
  needed,
}: {
  title: string;
  reason: string;
  needed?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CircleSlash className="text-muted-foreground size-4" />
          {title}
          <span className="border-border text-muted-foreground ml-1 rounded-md border px-1.5 py-0.5 text-[11px] font-normal">
            暂未开放
          </span>
        </p>
        <p className="text-muted-foreground text-xs">{reason}</p>
        {needed ? (
          <p className="text-muted-foreground text-xs">所需后端端点：{needed}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
