"use client";

import { useState } from "react";
import { Plus, Search, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useReconcileFreight, useReconciliations } from "../hooks";
import { formatDateTime, formatMoney } from "../lib/mappers";
import type { FreightDiffType } from "../types";

const PAGE_SIZE = 20;
const ALL = "__all__";

const DIFF_TYPE_OPTIONS: { value: FreightDiffType; label: string; hint: string }[] = [
  { value: "MATCH", label: "一致 MATCH", hint: "账单与模板重算一致" },
  { value: "OVERCHARGE", label: "多收 OVERCHARGE", hint: "账单高于应收" },
  { value: "UNDERCHARGE", label: "少收 UNDERCHARGE", hint: "账单低于应收" },
];

function DiffTypeBadge({ diffType }: { diffType: FreightDiffType }) {
  if (diffType === "OVERCHARGE") {
    return <Badge variant="destructive">多收</Badge>;
  }
  if (diffType === "UNDERCHARGE") {
    return <Badge variant="warning">少收</Badge>;
  }
  return <Badge variant="success">一致</Badge>;
}

export default function ReconciliationList() {
  const [page, setPage] = useState(1);
  const [batchDraft, setBatchDraft] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [diffType, setDiffType] = useState<FreightDiffType>();
  const [status, setStatus] = useState<string>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [waybillId, setWaybillId] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [billedAmount, setBilledAmount] = useState("");
  const [newBatchNo, setNewBatchNo] = useState("");
  const [operator, setOperator] = useState("web-ui");
  const reconcile = useReconcileFreight();

  const { data, isLoading } = useReconciliations({
    page,
    size: PAGE_SIZE,
    batchNo,
    diffType,
    status,
  });
  const rows = data?.records ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const submit = async () => {
    if (!waybillId.trim() || !billedAmount) return;
    await reconcile.mutateAsync({
      waybillId: waybillId.trim(),
      regionCode: regionCode.trim() || undefined,
      billedAmount: Number(billedAmount),
      batchNo: newBatchNo.trim() || undefined,
      operator: operator.trim() || undefined,
    });
    setDialogOpen(false);
    setWaybillId("");
    setRegionCode("");
    setBilledAmount("");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="履约网络"
        title="运费对账差异"
        description="按批次核对模板应收与承运商账单，差异分为 MATCH / OVERCHARGE / UNDERCHARGE"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            发起对账
          </Button>
        }
      />

      <TablePanel>
        <TableToolbar>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setBatchNo(batchDraft.trim());
              setPage(1);
            }}
          >
            <Input
              value={batchDraft}
              onChange={(event) => setBatchDraft(event.target.value)}
              placeholder="按对账批次查询"
              className="h-8 w-56 text-xs"
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
              value={diffType ?? ALL}
              onValueChange={(value) => {
                setDiffType(value === ALL ? undefined : (value as FreightDiffType));
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-40 text-xs">
                <span className="text-muted-foreground">差异</span>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部差异</SelectItem>
                {DIFF_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status ?? ALL}
              onValueChange={(value) => {
                setStatus(value === ALL ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-32 text-xs">
                <span className="text-muted-foreground">状态</span>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部状态</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-[11px]">
              共 {total} 条差异
            </span>
          </TableToolbarEnd>
        </TableToolbar>

        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          <TableEmpty>暂无对账差异</TableEmpty>
        ) : (
          <Table containerClassName="max-h-[calc(100vh-320px)] overflow-y-auto">
            <TableHeader>
              <TableRow>
                <TableHead>批次</TableHead>
                <TableHead>运单</TableHead>
                <TableHead>区域</TableHead>
                <TableHead numeric>应收</TableHead>
                <TableHead numeric>账单</TableHead>
                <TableHead numeric>差异</TableHead>
                <TableHead className="text-center">类型</TableHead>
                <TableHead className="text-center">状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-[11px]">
                    {row.batchNo}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-[11px]">{row.waybillNo}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {row.carrierId || "-"}
                    </div>
                  </TableCell>
                  <TableCell>{row.regionCode || "-"}</TableCell>
                  <TableCell numeric>{formatMoney(row.expectedAmount)}</TableCell>
                  <TableCell numeric>{formatMoney(row.billedAmount)}</TableCell>
                  <TableCell numeric>
                    <span
                      className={
                        row.diffAmount > 0
                          ? "text-[var(--color-error)]"
                          : row.diffAmount < 0
                            ? "text-[var(--color-warning)]"
                            : "text-[var(--color-success)]"
                      }
                    >
                      {formatMoney(row.diffAmount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <DiffTypeBadge diffType={row.diffType} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.status === "CONFIRMED" ? "success" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(row.createTime)}
                  </TableCell>
                </TableRow>
              ))}
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

      <div className="text-muted-foreground text-[11px]">
        差异口径：diffAmount = 账单金额 − 模板应收；正数为多收（OVERCHARGE），负数为少收（UNDERCHARGE），
        0 为一致（MATCH）。接口在批次 2 已实现，当前 OpenAPI 快照尚未收录（待后端上线）。
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发起运费对账</DialogTitle>
            <DialogDescription>
              选择运单并录入承运商账单金额；同批次同运单幂等。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">运单 ID</Label>
              <Input
                value={waybillId}
                onChange={(event) => setWaybillId(event.target.value)}
                placeholder="tms_waybill.id"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">对账批次（可选）</Label>
              <Input
                value={newBatchNo}
                onChange={(event) => setNewBatchNo(event.target.value)}
                placeholder="留空由后端生成批次号"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">区域编码（可选）</Label>
              <Input
                value={regionCode}
                onChange={(event) => setRegionCode(event.target.value)}
                placeholder="省份编码或 DEFAULT"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">承运商账单金额</Label>
              <Input
                value={billedAmount}
                onChange={(event) => setBilledAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">操作人</Label>
              <Input
                value={operator}
                onChange={(event) => setOperator(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              disabled={reconcile.isPending || !waybillId.trim() || !billedAmount}
              onClick={() => void submit()}
            >
              <Scale />
              生成差异
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
