"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/envelope";
import { useDictTypeList } from "@/features/system/hooks";

export default function DictionarySummary({ href }: { href: string }) {
  const { data, isLoading, isError, error, refetch } = useDictTypeList();

  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-lg" />;
  }

  if (isError) {
    return (
      <div className="border-border rounded-lg border px-4 py-3">
        <p className="text-sm font-medium">字典类型加载失败</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {toApiError(error).message}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => void refetch()}
        >
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div>
        <p className="text-sm font-medium">字典管理</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          共 {data?.length ?? 0} 个字典类型，数据来自 GET /api/system/dicts/types。
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>
          前往管理
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
