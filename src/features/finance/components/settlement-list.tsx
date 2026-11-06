"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { BackendPendingNote } from "@/components/ui/backend-pending-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
import {
  TableEmpty,
  TableLoading,
  TablePagination,
  TablePanel,
  TableToolbar,
} from "@/components/ui/table-shell";

import { usePermission } from "@/hooks/use-permission";

import { useSettlementList } from "../hooks";
import { formatMoney } from "../lib/money";
import { SETTLEMENT_STATUS_LABELS } from "../lib/mappers";
import type { Settlement } from "../types";
import { SettlementDetailDialog } from "./settlement-detail-dialog";

const PAGE_SIZE = 20;

const statusConfig: Record<
  Settlement["status"],
  { variant: "success" | "warning" | "info" | "destructive" }
> = {
  pending: { variant: "warning" },
  processing: { variant: "info" },
  completed: { variant: "success" },
  rejected: { variant: "destructive" },
};

const statusAccent: Record<Settlement["status"], string> = {
  pending: "var(--color-warning)",
  processing: "var(--color-info)",
  completed: "var(--color-success)",
  rejected: "var(--color-error)",
};

export default function SettlementList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<number | undefined>();
  const [detailId, setDetailId] = useState<string>("");
  const { hasPermission } = usePermission();
  const canView = hasPermission("finance:settlement-order:view");

  const { data, isLoading } = useSettlementList({
    page,
    size: PAGE_SIZE,
    status,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const periods = Array.from(
    new Set(rows.map((row) => row.period).filter((period) => period !== "-")),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="财务管理"
        title="结算管理"
        description="管理供应商结算单、账期与付款进度"
      />

      <BackendPendingNote>
        账期开/闭状态暂无查询端点（后端 `fin_accounting_period` 未对前端开放），
        当前仅展示结算单所属账期
        {periods.length > 0 ? `：${periods.join("、")}` : "。"}
      </BackendPendingNote>

      <TablePanel>
        <TableToolbar>
          <Select
            value={status === undefined ? "all" : String(status)}
            onValueChange={(value) => {
              setPage(1);
              setStatus(value === "all" ? undefined : Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue placeholder="结算状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(SETTLEMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-[11px]">
            结算单按租户上下文隔离
          </span>
        </TableToolbar>

        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          <TableEmpty>暂无结算单</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">结算单</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead numeric>金额</TableHead>
                <TableHead numeric>账期</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((settlement) => {
                const config = statusConfig[settlement.status];
                return (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div
                        className="border-l-4 pl-2"
                        style={{
                          borderLeftColor: statusAccent[settlement.status],
                        }}
                      >
                        <div className="font-mono text-[12px] font-semibold">
                          {settlement.settlementNo}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[10px]">
                          {settlement.supplierName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{settlement.supplierName || "-"}</TableCell>
                    <TableCell numeric className="font-semibold">
                      {formatMoney(settlement.amount)}
                    </TableCell>
                    <TableCell numeric>{settlement.period || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.variant}>{settlement.statusLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {settlement.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate
                        allowed={canView}
                        reason="无权限：需要 finance:settlement-order:view"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canView}
                          onClick={() => setDetailId(settlement.id)}
                        >
                          <Eye className="size-3.5" />
                          详情
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          onPageChange={setPage}
        />
      </TablePanel>

      <SettlementDetailDialog
        settlementId={detailId}
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId("");
        }}
      />
    </div>
  );
}
