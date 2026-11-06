"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RefreshCw, Scale, XCircle } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  useCancelWaybill,
  useFreightQuote,
  useFreightTemplates,
  useReconcileFreight,
  useTrackingEvents,
  useUpdateWaybillStatus,
  useWaybill,
} from "../hooks";
import { formatDateTime, formatMoney } from "../lib/mappers";
import {
  ALL_WAYBILL_STATUS_CODES,
  isCancellable,
  isTerminalStatus,
  transitionBlockedReason,
  WAYBILL_STATUS_META,
  waybillStatusMeta,
} from "../lib/waybill-status";
import TrackingTimeline from "./tracking-timeline";
import type {
  FreightQuote,
  FreightReconciliation,
  Waybill,
  WaybillStatus,
} from "../types";

interface Props {
  id: string;
}

const DEFAULT_BATCH = () => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return `FR-${date}`;
};

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-secondary)] py-2 last:border-b-0">
      <span className="text-muted-foreground shrink-0 text-[11px]">{label}</span>
      <span className="text-right text-[12px] font-medium">{value || "-"}</span>
    </div>
  );
}

function QuoteLine({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] py-1.5 last:border-b-0">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <span
        className={
          emphasis
            ? "text-[13px] font-semibold tabular-nums"
            : "text-[12px] tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function FreightQuoteCard({ waybill }: { waybill: Waybill }) {
  const { data: templates } = useFreightTemplates(waybill.carrierId);
  const quote = useFreightQuote();
  const [weight, setWeight] = useState(String(waybill.goodsWeight ?? ""));
  const [volume, setVolume] = useState(String(waybill.goodsVolume ?? ""));
  const [region, setRegion] = useState("");
  const [result, setResult] = useState<FreightQuote | null>(null);

  const matchedTemplate = useMemo(() => {
    if (!templates || templates.length === 0) return null;
    const regionCode = region.trim().toUpperCase();
    return (
      templates.find(
        (item) => (item.regionCode ?? "").toUpperCase() === regionCode
      ) ??
      templates.find(
        (item) => (item.regionCode ?? "").toUpperCase() === "DEFAULT"
      ) ??
      templates[0]
    );
  }, [templates, region]);

  const minCharge = matchedTemplate?.minCharge;
  const quoteWasMinCharge =
    result != null &&
    typeof minCharge === "number" &&
    Math.abs(result.totalAmount - minCharge) < 0.005;

  const submit = async () => {
    if (!waybill.carrierId) return;
    const parsedWeight = Number(weight);
    const parsedVolume = Number(volume);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) return;
    const quoted = await quote.mutateAsync({
      carrierId: waybill.carrierId,
      regionCode: region.trim() || undefined,
      weight: parsedWeight,
      volume: Number.isFinite(parsedVolume) && parsedVolume > 0 ? parsedVolume : 0,
    });
    setResult(quoted);
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>运费明细</CardTitle>
          <span className="text-muted-foreground text-[11px]">
            已记运费 {formatMoney(waybill.freightAmount)}
          </span>
        </div>
        <div className="text-muted-foreground text-[11px]">
          首重 / 续重 / 体积重 / 区域附加费 / 最低收费按模板拆分展示。
          试算接口在批次 2 已实现，当前 OpenAPI 快照尚未收录（待后端上线）。
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {waybill.carrierId ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-[10px]">重量（kg）</Label>
                <Input
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  inputMode="decimal"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">体积（m³）</Label>
                <Input
                  value={volume}
                  onChange={(event) => setVolume(event.target.value)}
                  inputMode="decimal"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">区域编码</Label>
                <Input
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="如 ZJ / DEFAULT"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-[11px]"
                  disabled={quote.isPending || !weight}
                  onClick={() => void submit()}
                >
                  <RefreshCw />
                  试算
                </Button>
              </div>
            </div>

            {matchedTemplate && (
              <div className="text-muted-foreground rounded-lg border border-[var(--color-border-secondary)] px-3 py-2 text-[10px]">
                模板：{matchedTemplate.templateName ?? matchedTemplate.id}
                {matchedTemplate.regionCode
                  ? ` · 区域 ${matchedTemplate.regionCode}`
                  : ""}
                {typeof matchedTemplate.minCharge === "number"
                  ? ` · 最低收费 ${formatMoney(matchedTemplate.minCharge)}`
                  : ""}
              </div>
            )}

            {result ? (
              <div className="rounded-lg border border-[var(--color-border-secondary)] px-3 py-1">
                <QuoteLine
                  label="实重 / 体积重"
                  value={`${result.actualWeight.toFixed(2)} / ${result.volumetricWeight.toFixed(2)} kg`}
                />
                <QuoteLine
                  label="计费重 / 进位重"
                  value={`${result.chargeableWeight.toFixed(2)} / ${result.billedWeight.toFixed(2)} kg`}
                />
                <QuoteLine label="首重费" value={formatMoney(result.firstWeightFee)} />
                <QuoteLine label="续重费" value={formatMoney(result.additionalFee)} />
                <QuoteLine
                  label="区域附加费"
                  value={formatMoney(result.regionSurcharge)}
                />
                <QuoteLine label="最低收费（模板）" value={formatMoney(minCharge)} />
                <QuoteLine
                  label="应收合计"
                  value={formatMoney(result.totalAmount)}
                  emphasis
                />
                {quoteWasMinCharge && (
                  <div className="text-muted-foreground pt-1.5 text-[10px]">
                    合计已按模板最低收费兜底。
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground rounded-lg border border-dashed border-[var(--color-border-secondary)] px-3 py-6 text-center text-[11px]">
                输入重量并试算后展示拆分明细
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed border-[var(--color-border-secondary)] px-3 py-6 text-center text-[11px]">
            运单未关联承运商，无法试算运费。
          </div>
        )}
      </CardContent>
    </Card>
    );
}

export default function WaybillDetail({ id }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const campaignPath = pathname.replace(/\/[^/]+$/, "");
  const { data: waybill, isLoading, isError } = useWaybill(id);
  const { data: events } = useTrackingEvents(id);
  const updateStatus = useUpdateWaybillStatus();
  const cancelWaybill = useCancelWaybill();
  const reconcile = useReconcileFreight();

  const [pendingStatus, setPendingStatus] = useState<WaybillStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileRegion, setReconcileRegion] = useState("");
  const [reconcileBilled, setReconcileBilled] = useState("");
  const [reconcileBatch, setReconcileBatch] = useState(DEFAULT_BATCH());
  const [reconcileResult, setReconcileResult] =
    useState<FreightReconciliation | null>(null);

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center text-[12px]">
        运单加载中…
      </div>
    );
  }

  if (isError || !waybill) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="履约网络" title="运单详情" />
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-[12px]">
            运单不存在或加载失败。
            <Button
              variant="link"
              size="sm"
              onClick={() => router.push(campaignPath)}
            >
              返回运单列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = waybill.status;
  const statusMeta = waybillStatusMeta(current);
  const terminal = isTerminalStatus(current);
  const cancellable = isCancellable(current);
  const cancelBlockedReason = cancellable
    ? null
    : terminal
      ? `运单已处于终态「${statusMeta.label}」，不可取消`
      : '派送中及之后的状态不可直接取消，请走退回流程';

  const submitTransition = async () => {
    if (pendingStatus == null) return;
    await updateStatus.mutateAsync({
      id,
      status: pendingStatus,
      operator: "web-ui",
    });
    setPendingStatus(null);
  };

  const submitCancel = async () => {
    await cancelWaybill.mutateAsync({
      id,
      reason: cancelReason.trim() || undefined,
      operator: "web-ui",
    });
    setCancelOpen(false);
  };

  const submitReconcile = async () => {
    const billedAmount = Number(reconcileBilled);
    if (!Number.isFinite(billedAmount) || billedAmount < 0) return;
    const result = await reconcile.mutateAsync({
      waybillId: waybill.id,
      regionCode: reconcileRegion.trim() || undefined,
      billedAmount,
      batchNo: reconcileBatch.trim() || undefined,
      operator: "web-ui",
    });
    setReconcileResult(result);
    setReconcileOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="履约网络"
        title={`运单 ${waybill.waybillNo}`}
        description={`订单 ${waybill.orderNo} · 承运商 ${waybill.carrierName}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => router.push(campaignPath)}
            >
              <ArrowLeft />
              返回列表
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`${campaignPath}/reconciliation`)}
            >
              <Scale />
              对账差异
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>运单信息</CardTitle>
              <Badge variant={statusMeta.variant}>
                {current} · {statusMeta.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 px-4">
            <InfoRow label="运单号" value={waybill.waybillNo} />
            <InfoRow label="订单号" value={waybill.orderNo} />
            <InfoRow label="承运商" value={waybill.carrierName} />
            <InfoRow label="跟踪号" value={waybill.trackingNo} />
            <InfoRow label="寄件人" value={`${waybill.senderName}${waybill.senderPhone ? ` · ${waybill.senderPhone}` : ""}`} />
            <InfoRow label="寄件地址" value={waybill.senderAddress} />
            <InfoRow label="收件人" value={`${waybill.receiverName}${waybill.receiverPhone ? ` · ${waybill.receiverPhone}` : ""}`} />
            <InfoRow label="收件地址" value={waybill.receiverAddress} />
            <InfoRow label="商品" value={waybill.goodsName} />
            <InfoRow
              label="重量 / 体积"
              value={`${waybill.goodsWeight ?? "-"} kg / ${waybill.goodsVolume ?? "-"} m³`}
            />
            <InfoRow label="快递员" value={waybill.courierName} />
            <InfoRow label="签收时间" value={formatDateTime(waybill.signTime)} />
            <InfoRow
              label="实际送达"
              value={formatDateTime(waybill.actualDelivery)}
            />
            {waybill.exceptionReason && (
              <InfoRow label="异常原因" value={waybill.exceptionReason} />
            )}
            <InfoRow label="创建时间" value={formatDateTime(waybill.createdAt)} />
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle>状态流转</CardTitle>
            <div className="text-muted-foreground text-[11px]">
              仅展示后端 WaybillStatus 白名单允许的迁移；终态与非法迁移按钮置灰。
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {terminal && (
              <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-3 py-2 text-[11px]">
                运单已处于终态「{statusMeta.label}」，不再接受状态流转。
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_WAYBILL_STATUS_CODES.map((target) => {
                const reason = transitionBlockedReason(current, target);
                return (
                  <Button
                    key={target}
                    variant="outline"
                    size="sm"
                    disabled={!!reason}
                    title={reason ?? undefined}
                    onClick={() => setPendingStatus(target)}
                    className="h-8 justify-start text-[11px]"
                  >
                    {target} · {waybillStatusMeta(target).label}
                  </Button>
                );
              })}
            </div>
            <div className="border-t border-[var(--color-border-secondary)] pt-3">
              <Button
                variant="destructive"
                size="sm"
                disabled={!cancellable}
                title={cancelBlockedReason ?? undefined}
                onClick={() => setCancelOpen(true)}
              >
                <XCircle />
                取消运单
              </Button>
              {cancelBlockedReason && (
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {cancelBlockedReason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FreightQuoteCard waybill={waybill} />

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle>运费对账</CardTitle>
            <div className="text-muted-foreground text-[11px]">
              以模板重算应收，与承运商账单比较，差异分类为 MATCH /
              OVERCHARGE / UNDERCHARGE。
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <div className="grid gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-fit text-[11px]"
                onClick={() => {
                  setReconcileBilled(String(waybill.freightAmount ?? ""));
                  setReconcileOpen(true);
                }}
              >
                <Scale />
                发起对账
              </Button>
              {reconcileResult && (
                <div className="rounded-lg border border-[var(--color-border-secondary)] px-3 py-2 text-[11px]">
                  <div>
                    批次 {reconcileResult.batchNo}：应收{" "}
                    {formatMoney(reconcileResult.expectedAmount)}，账单{" "}
                    {formatMoney(reconcileResult.billedAmount)}，差异{" "}
                    {formatMoney(reconcileResult.diffAmount)}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <DiffBadge diffType={reconcileResult.diffType} />
                    <span className="text-muted-foreground">
                      {reconcileResult.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <TrackingTimeline
        waybillId={id}
        events={events}
        signTime={formatDateTime(waybill.signTime)}
      />

      <Dialog
        open={pendingStatus != null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              流转到 {pendingStatus != null ? waybillStatusMeta(pendingStatus).label : ""}
            </DialogTitle>
            <DialogDescription>
              当前状态「{statusMeta.label}」→ 目标状态「
              {pendingStatus != null ? waybillStatusMeta(pendingStatus).label : ""}
              」。后端会再次校验迁移白名单。
            </DialogDescription>
          </DialogHeader>
          <div className="text-muted-foreground text-[11px]">
            操作人将记录为 web-ui。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>
              取消
            </Button>
            <Button
              disabled={updateStatus.isPending}
              onClick={() => void submitTransition()}
            >
              <CheckCircle2 />
              确认流转
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消运单</DialogTitle>
            <DialogDescription>
              取消会记录原因与操作人；已签收/已退回的运单不可取消。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-[11px]">取消原因</Label>
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="填写取消原因，便于审计追溯"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              返回
            </Button>
            <Button
              variant="destructive"
              disabled={cancelWaybill.isPending}
              onClick={() => void submitCancel()}
            >
              确认取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发起运费对账</DialogTitle>
            <DialogDescription>
              同一批次 + 同一运单在后端幂等，只会落一条差异记录。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[11px]">对账批次</Label>
              <Input
                value={reconcileBatch}
                onChange={(event) => setReconcileBatch(event.target.value)}
                placeholder="如 FR-20261106"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">区域编码</Label>
              <Input
                value={reconcileRegion}
                onChange={(event) => setReconcileRegion(event.target.value)}
                placeholder="省份编码或 DEFAULT"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">承运商账单金额</Label>
              <Input
                value={reconcileBilled}
                onChange={(event) => setReconcileBilled(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileOpen(false)}>
              取消
            </Button>
            <Button
              disabled={reconcile.isPending || !reconcileBilled}
              onClick={() => void submitReconcile()}
            >
              生成差异
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffBadge({ diffType }: { diffType: FreightReconciliation["diffType"] }) {
  if (diffType === "OVERCHARGE") {
    return <Badge variant="destructive">多收 OVERCHARGE</Badge>;
  }
  if (diffType === "UNDERCHARGE") {
    return <Badge variant="warning">少收 UNDERCHARGE</Badge>;
  }
  return <Badge variant="success">一致 MATCH</Badge>;
}
