"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { BackendPendingNote } from "@/components/ui/backend-pending-note";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useSettlementDetail } from "../hooks";
import { formatMoney } from "../lib/money";
import type { Settlement } from "../types";

const statusVariant: Record<
  Settlement["status"],
  "success" | "warning" | "info" | "destructive"
> = {
  pending: "warning",
  processing: "info",
  completed: "success",
  rejected: "destructive",
};

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd className={mono ? "mt-0.5 font-mono text-[12px]" : "mt-0.5 text-[13px]"}>
        {children}
      </dd>
    </div>
  );
}

export function SettlementDetailDialog({
  settlementId,
  open,
  onOpenChange,
}: {
  settlementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: settlement, isLoading, isError } = useSettlementDetail(settlementId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>结算单详情</DialogTitle>
          <DialogDescription>
            金额均为后端返回值，前端只做千分位与两位小数展示。
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isError || !settlement ? (
          <div className="text-muted-foreground py-10 text-center text-[13px]">
            结算单加载失败或不存在
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="结算单号" mono>
                {settlement.settlementNo}
              </Field>
              <Field label="结算状态">
                <Badge variant={statusVariant[settlement.status]}>
                  {settlement.statusLabel}
                </Badge>
              </Field>
              <Field label="往来方">{settlement.supplierName}</Field>
              <Field label="往来方类型">{settlement.partnerType}</Field>
              <Field label="账期">{settlement.period}</Field>
              <Field label="结算区间">
                {settlement.startDate} ~ {settlement.endDate}
              </Field>
            </div>

            <div className="rounded-lg border border-[var(--color-border-secondary)] p-4">
              <div className="mb-3 text-[12px] font-medium">金额明细</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="结算总额" mono>
                  {formatMoney(settlement.totalAmount)}
                </Field>
                <Field label="折扣金额" mono>
                  {formatMoney(settlement.discountAmount)}
                </Field>
                <Field label="调整金额" mono>
                  {formatMoney(settlement.adjustmentAmount)}
                </Field>
                <Field label="应付金额" mono>
                  {formatMoney(settlement.amount)}
                </Field>
                <Field label="已付金额" mono>
                  {formatMoney(settlement.paidAmount)}
                </Field>
                <Field label="未付金额" mono>
                  {formatMoney(settlement.unpaidAmount)}
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="审批人">{settlement.approverName}</Field>
              <Field label="确认时间">{settlement.approvedAt}</Field>
              <Field label="创建时间">{settlement.createdAt}</Field>
            </div>

            <BackendPendingNote>
              后端未提供账期（`fin_accounting_period`）查询端点，账期开/闭状态
              暂无法展示；当前仅展示该结算单所属账期「{settlement.period}」。
            </BackendPendingNote>

            <Field label="备注">{settlement.remark}</Field>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
