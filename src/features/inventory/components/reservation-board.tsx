"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Search, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/table-shell";
import {
  useConfirmReservation,
  useReleaseExpiredReservations,
  useReleaseReservation,
  useReservationLookup,
} from "../hooks";
import {
  canConfirmReservation,
  canReleaseReservation,
  RESERVATION_DEMO_ROWS,
  RESERVATION_STATUS_META,
  reservationActionBlockedReason,
} from "../lib/reservation";
import type {
  ReservationLookupResult,
  ReservationRecord,
  ReservationStatusValue,
} from "../types";

type ReservationAction = "confirm" | "release";

interface PendingAction {
  record: ReservationRecord;
  action: ReservationAction;
}

const demoBlockedReason =
  "演示数据（mock），没有真实业务键，不能调用确认/释放接口";

const recordBlockedReason = (record: ReservationRecord): string | null => {
  if (record.demo) return demoBlockedReason;
  return record.status === "RESERVED"
    ? null
    : reservationActionBlockedReason(record.status);
};

const statusMeta = (status: ReservationStatusValue) =>
  RESERVATION_STATUS_META[status];

export default function ReservationBoard() {
  const [businessKey, setBusinessKey] = useState("");
  const [lookupResult, setLookupResult] =
    useState<ReservationLookupResult | null>(null);
  const [rows, setRows] = useState<ReservationRecord[]>(RESERVATION_DEMO_ROWS);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const lookup = useReservationLookup();
  const confirmReservation = useConfirmReservation();
  const releaseReservation = useReleaseReservation();
  const releaseExpired = useReleaseExpiredReservations();

  const runLookup = async (key: string) => {
    const result = await lookup.mutateAsync(key);
    setLookupResult(result);
    if (result.exists) {
      const record: ReservationRecord = {
        businessKey: key,
        quantity: result.quantity ?? 0,
        status: "RESERVED",
        reservedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        demo: false,
      };
      setRows((previous) => {
        const without = previous.filter((row) => row.businessKey !== key);
        return [record, ...without.filter((row) => !row.demo)];
      });
    }
  };

  const submitAction = async () => {
    if (!pending) return;
    const { record, action } = pending;
    if (action === "confirm") {
      await confirmReservation.mutateAsync(record.businessKey);
      setRows((previous) =>
        previous.map((row) =>
          row.businessKey === record.businessKey
            ? { ...row, status: "CONFIRMED" }
            : row
        )
      );
    } else {
      await releaseReservation.mutateAsync(record.businessKey);
      setRows((previous) =>
        previous.map((row) =>
          row.businessKey === record.businessKey
            ? { ...row, status: "RELEASED" }
            : row
        )
      );
    }
    setLookupResult((previous) =>
      previous?.businessKey === record.businessKey ? null : previous
    );
    setPending(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="库存运营"
        title="预占管理"
        description="按业务键查询预占、执行确认扣减或释放；状态机包含 RESERVED / CONFIRMED / RELEASED / EXPIRED"
        actions={
          <Button
            variant="outline"
            disabled={releaseExpired.isPending}
            onClick={() => void releaseExpired.mutateAsync()}
          >
            <TimerReset />
            释放过期预占
          </Button>
        }
      />

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>按业务键查询</CardTitle>
          <div className="text-muted-foreground text-[11px]">
            调用后端真实的 <code>/reservation/check</code> 与
            <code>/reservation/quantity</code>；两者只对 RESERVED 状态有值。
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const key = businessKey.trim();
              if (key) void runLookup(key);
            }}
          >
            <Input
              value={businessKey}
              onChange={(event) => setBusinessKey(event.target.value)}
              placeholder="业务键，如订单号 / 出库单号"
              className="max-w-md"
            />
            <Button
              type="submit"
              disabled={lookup.isPending || !businessKey.trim()}
            >
              <Search />
              查询
            </Button>
          </form>

          {lookupResult && (
            <div className="rounded-lg border border-[var(--color-border-secondary)] px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-semibold">
                  {lookupResult.businessKey}
                </span>
                {lookupResult.exists ? (
                  <Badge variant="info">RESERVED · 已预占</Badge>
                ) : (
                  <Badge variant="secondary">不在 RESERVED</Badge>
                )}
                <span className="text-muted-foreground text-[11px]">
                  预占数量：{lookupResult.quantity ?? "未知"}
                </span>
              </div>
              {lookupResult.exists ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={confirmReservation.isPending}
                    onClick={() =>
                      setPending({
                        record: {
                          businessKey: lookupResult.businessKey,
                          quantity: lookupResult.quantity ?? 0,
                          status: "RESERVED",
                          demo: false,
                        },
                        action: "confirm",
                      })
                    }
                  >
                    确认扣减
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={releaseReservation.isPending}
                    onClick={() =>
                      setPending({
                        record: {
                          businessKey: lookupResult.businessKey,
                          quantity: lookupResult.quantity ?? 0,
                          status: "RESERVED",
                          demo: false,
                        },
                        action: "release",
                      })
                    }
                  >
                    释放预占
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground mt-2 text-[11px]">
                  后端只返回“是否存在有效预占”，无法区分已确认、已释放或已过期；
                  预占状态查询接口待后端上线。
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TablePanel>
        <TableToolbar>
          <span className="text-muted-foreground text-[11px]">
            下表前 4 行为 <strong>mock 演示数据</strong>（后端未提供预占列表接口）；
            按业务键查询成功的记录以真实接口为准并在本会话内追加。
          </span>
        </TableToolbar>

        <Table containerClassName="max-h-[calc(100vh-420px)] overflow-y-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">业务键</TableHead>
              <TableHead>SKU / 仓库</TableHead>
              <TableHead numeric>数量</TableHead>
              <TableHead className="text-center">状态</TableHead>
              <TableHead>预占时间</TableHead>
              <TableHead className="text-center">来源</TableHead>
              <TableHead className="min-w-[240px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((record) => {
              const meta = statusMeta(record.status);
              const blocked = recordBlockedReason(record);
              return (
                <TableRow key={`${record.businessKey}-${record.status}`}>
                  <TableCell className="font-mono text-[11px]">
                    {record.businessKey}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-[10px]">
                      {record.skuId ?? "-"}
                    </div>
                    <div className="text-muted-foreground font-mono text-[10px]">
                      {record.warehouseId ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell numeric>{record.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={meta.variant}>
                      {record.status} · {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {record.reservedAt ?? "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.demo ? (
                      <Badge variant="warning">mock</Badge>
                    ) : (
                      <Badge variant="success">真实</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        disabled={
                          !!blocked ||
                          !canConfirmReservation(record.status) ||
                          confirmReservation.isPending
                        }
                        title={blocked ?? undefined}
                        onClick={() => setPending({ record, action: "confirm" })}
                      >
                        <CheckCircle2 />
                        确认
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        disabled={
                          !!blocked ||
                          !canReleaseReservation(record.status) ||
                          releaseReservation.isPending
                        }
                        title={blocked ?? undefined}
                        onClick={() => setPending({ record, action: "release" })}
                      >
                        <RotateCcw />
                        释放
                      </Button>
                    </div>
                    {blocked && (
                      <div className="text-muted-foreground mt-1 text-right text-[10px]">
                        {blocked}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TablePanel>

      <Dialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === "confirm" ? "确认预占并扣减" : "释放预占"}
            </DialogTitle>
            <DialogDescription>
              业务键 <code>{pending?.record.businessKey}</code>，数量{" "}
              {pending?.record.quantity}。该操作会调用后端真实接口，成功后预占进入
              {pending?.action === "confirm" ? "CONFIRMED" : "RELEASED"} 终态。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button
              variant={pending?.action === "release" ? "destructive" : "default"}
              disabled={confirmReservation.isPending || releaseReservation.isPending}
              onClick={() => void submitAction()}
            >
              {pending?.action === "confirm" ? "确认扣减" : "确认释放"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-muted-foreground text-[11px]">
        EXPIRED 由后端 900 秒有效期到期自动释放；“释放过期预占”调用
        <code>/reservation/release-expired</code> 做一次补偿清理。
      </div>
    </div>
  );
}
