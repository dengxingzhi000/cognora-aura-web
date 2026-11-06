"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

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
  TableEmpty,
  TableLoading,
  TablePanel,
  TablePagination,
  TableToolbar,
  TableToolbarEnd,
} from "@/components/ui/table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWaybillList } from "../hooks";
import { formatDateTime, formatMoney } from "../lib/mappers";
import {
  ALL_WAYBILL_STATUS_CODES,
  WAYBILL_STATUS_META,
  WAYBILL_STATUS_OPTIONS,
  waybillStatusMeta,
} from "../lib/waybill-status";
import type { WaybillStatus } from "../types";

const PAGE_SIZE = 20;
const ALL = "__all__";

export default function WaybillList() {
  const pathname = usePathname();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [waybillNoDraft, setWaybillNoDraft] = useState("");
  const [waybillNo, setWaybillNo] = useState("");
  const [status, setStatus] = useState<WaybillStatus>();

  const { data, isLoading } = useWaybillList({
    page,
    size: PAGE_SIZE,
    waybillNo,
    status,
  });
  const rows = data?.records ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="履约网络"
        title="运单管理"
        description="按后端 WaybillStatus（0 待揽件 … 6 退回/取消）筛选中转单并进入操作详情"
      />

      <TablePanel>
        <TableToolbar>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setWaybillNo(waybillNoDraft.trim());
              setPage(1);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={waybillNoDraft}
              onChange={(event) => setWaybillNoDraft(event.target.value)}
              placeholder="按运单号精确查询"
              className="h-8 w-64 text-xs"
            />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="查询"
            >
              <Search />
            </Button>
          </form>

          <TableToolbarEnd>
            <Select
              value={status === undefined ? ALL : String(status)}
              onValueChange={(value) => {
                setStatus(
                  value === ALL ? undefined : (Number(value) as WaybillStatus)
                );
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-36 text-xs">
                <span className="text-muted-foreground">状态</span>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部状态</SelectItem>
                {WAYBILL_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}（{option.value}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-[11px]">
              共 {total} 张运单
            </span>
          </TableToolbarEnd>
        </TableToolbar>

        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          <TableEmpty>暂无运单</TableEmpty>
        ) : (
          <Table containerClassName="max-h-[calc(100vh-320px)] overflow-y-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">运单</TableHead>
                <TableHead>订单号</TableHead>
                <TableHead>承运商</TableHead>
                <TableHead>收件人</TableHead>
                <TableHead numeric>运费</TableHead>
                <TableHead>签收时间</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((waybill) => {
                const config = WAYBILL_STATUS_META[waybill.status];
                return (
                  <TableRow key={waybill.id}>
                    <TableCell>
                      <div
                        className="border-l-4 pl-2"
                        style={{ borderLeftColor: config.accent }}
                      >
                        <div className="font-mono text-[12px] font-semibold">
                          {waybill.waybillNo}
                        </div>
                        <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                          {waybill.trackingNo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {waybill.orderNo}
                    </TableCell>
                    <TableCell>{waybill.carrierName || "-"}</TableCell>
                    <TableCell>{waybill.receiverName || "-"}</TableCell>
                    <TableCell numeric>
                      {formatMoney(waybill.freightAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(waybill.signTime)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {waybill.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => router.push(`${pathname}/${waybill.id}`)}
                      >
                        详情
                        <ArrowRight />
                      </Button>
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
          pageCount={pageCount}
          onPageChange={setPage}
        />
      </TablePanel>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {ALL_WAYBILL_STATUS_CODES.map((code) => (
          <span key={code}>
            {code} · {waybillStatusMeta(code).label}
          </span>
        ))}
      </div>
    </div>
  );
}
