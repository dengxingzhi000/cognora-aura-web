"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
import {
  TablePanel,
  TableToolbar,
  TableToolbarEnd,
} from "@/components/ui/table-shell";
import {
  MOVEMENT_TYPE_META,
  STOCK_MOVEMENT_DEMO_ROWS,
} from "../lib/reservation";
import type { StockMovementType } from "../types";

const ALL = "__all__";

export default function StockMovements() {
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<StockMovementType>();
  const [warehouse, setWarehouse] = useState("");
  const [keyword, setKeyword] = useState("");

  const rows = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return STOCK_MOVEMENT_DEMO_ROWS.filter((row) => {
      if (type && row.type !== type) return false;
      if (warehouse.trim() && !row.warehouseId.toLowerCase().includes(warehouse.trim().toLowerCase())) {
        return false;
      }
      if (
        term &&
        !row.skuId.toLowerCase().includes(term) &&
        !(row.referenceNo ?? "").toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [type, warehouse, keyword]);

  const alarmsPath = `${pathname.replace(/\/movements$/u, "")}/alerts`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="库存运营"
        title="库存流水"
        description="按时间回溯库存变动；当前后端只落库 inv_log，未暴露查询接口"
        actions={
          <Button variant="outline" onClick={() => router.push(alarmsPath)}>
            <Bell />
            库存预警
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-3 py-2 text-[11px]">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          当前表格为 <strong>mock 演示数据</strong>：后端 `inv_log` 已写入但未提供
          列表/分页接口，库存流水查询接口待后端上线。下方筛选仅作用于演示数据。
        </span>
      </div>

      <TablePanel>
        <TableToolbar>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按 SKU 或单据号过滤"
              className="h-8 w-56 text-xs"
            />
            <Input
              value={warehouse}
              onChange={(event) => setWarehouse(event.target.value)}
              placeholder="按仓库 ID 过滤"
              className="h-8 w-48 text-xs"
            />
          </form>
          <TableToolbarEnd>
            <Select
              value={type ?? ALL}
              onValueChange={(value) =>
                setType(value === ALL ? undefined : (value as StockMovementType))
              }
            >
              <SelectTrigger size="sm" className="w-36 text-xs">
                <span className="text-muted-foreground">类型</span>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部类型</SelectItem>
                {(Object.keys(MOVEMENT_TYPE_META) as StockMovementType[]).map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {MOVEMENT_TYPE_META[value].label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-[11px]">
              共 {rows.length} 条（mock）
            </span>
          </TableToolbarEnd>
        </TableToolbar>

        <Table containerClassName="max-h-[calc(100vh-380px)] overflow-y-auto">
          <TableHeader>
            <TableRow>
              <TableHead>发生时间</TableHead>
              <TableHead className="text-center">类型</TableHead>
              <TableHead className="min-w-[200px]">SKU / 仓库</TableHead>
              <TableHead numeric>变动数量</TableHead>
              <TableHead numeric>变动前可用</TableHead>
              <TableHead numeric>变动后可用</TableHead>
              <TableHead>单据号</TableHead>
              <TableHead>操作人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-10 text-center text-[12px]">
                  没有匹配的流水
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const meta = MOVEMENT_TYPE_META[row.type];
                const positive = row.availableAfter >= row.availableBefore;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {row.occurredAt}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={meta.variant}>
                        {meta.sign} {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-[11px]">{row.skuId}</div>
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {row.warehouseId}
                      </div>
                    </TableCell>
                    <TableCell numeric>
                      <span
                        className={
                          row.quantity >= 0
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-error)]"
                        }
                      >
                        {row.quantity > 0 ? "+" : ""}
                        {row.quantity}
                      </span>
                    </TableCell>
                    <TableCell numeric>{row.availableBefore}</TableCell>
                    <TableCell numeric>
                      <span
                        className={
                          positive
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-error)]"
                        }
                      >
                        {row.availableAfter}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {row.referenceNo ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {row.operator ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TablePanel>

      <div className="text-muted-foreground text-[11px]">
        预占与释放流水也会写入库存流水；预占相关状态请到“预占管理”页面操作。
      </div>
    </div>
  );
}
