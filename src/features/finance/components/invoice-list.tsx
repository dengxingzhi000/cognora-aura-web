"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  TableEmpty,
  TableLoading,
  TablePagination,
  TablePanel,
} from "@/components/ui/table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useInvoiceList } from "../hooks";
import { formatMoney } from "../lib/money";
import type { Invoice } from "../types";

const PAGE_SIZE = 20;

const statusConfig: Record<
  Invoice["status"],
  {
    variant: "success" | "warning" | "info" | "destructive" | "secondary";
  }
> = {
  pending: { variant: "warning" },
  issued: { variant: "info" },
  sent: { variant: "info" },
  received: { variant: "success" },
  voided: { variant: "destructive" },
  red_flushed: { variant: "secondary" },
};

const statusAccent: Record<Invoice["status"], string> = {
  pending: "var(--color-warning)",
  issued: "var(--color-info)",
  sent: "var(--color-info)",
  received: "var(--color-success)",
  voided: "var(--color-error)",
  red_flushed: "var(--color-border-strong)",
};

export default function InvoiceList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvoiceList({ page, size: PAGE_SIZE });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="财务管理"
        title="发票管理"
        description="跟踪结算单开票、寄送与接收状态（只读列表）"
      />

      <TablePanel>
        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          <TableEmpty>暂无发票</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">发票</TableHead>
                <TableHead>往来方</TableHead>
                <TableHead numeric>金额</TableHead>
                <TableHead numeric>税额</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((invoice) => {
                const config = statusConfig[invoice.status];
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div
                        className="border-l-4 pl-2"
                        style={{
                          borderLeftColor: statusAccent[invoice.status],
                        }}
                      >
                        <div className="font-mono text-[12px] font-semibold">
                          {invoice.invoiceNo}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[10px]">
                          结算单 {invoice.settlementNo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.partyName || "-"}</TableCell>
                    <TableCell numeric className="font-semibold">
                      {formatMoney(invoice.amount)}
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {formatMoney(invoice.taxAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.variant}>{invoice.statusLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.createdAt}
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
    </div>
  );
}
