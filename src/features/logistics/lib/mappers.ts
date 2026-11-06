import dayjs from "dayjs";

import type {
  TmsFreightQuoteDTO,
  TmsFreightReconciliationDTO,
  TmsFreightReconciliationPage,
  TmsFreightTemplateDTO,
  TmsTrackingDTO,
  TmsWaybillDTO,
  TmsWaybillPage,
} from "@/lib/api/contracts/logistics";
import type {
  FreightDiffType,
  FreightQuote,
  FreightReconciliation,
  ReconciliationStatus,
  TrackingEvent,
  Waybill,
  WaybillStatus,
} from "../types";
import {
  isKnownWaybillStatus,
  trackingStatusLabel,
  waybillStatusMeta,
} from "./waybill-status";

export const formatDate = (value?: string | null): string =>
  value ? dayjs(value).format("YYYY-MM-DD") : "-";

export const formatDateTime = (value?: string | null): string =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

const num = (value?: number | null): number => value ?? 0;

export const formatMoney = (value?: number | null): string =>
  typeof value === "number" ? value.toFixed(2) : "-";

/** `sender_address` / `receiver_address` are JSONB objects serialized as strings. */
const formatAddress = (value?: string | null): string => {
  if (!value) return "-";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const parts = ["province", "city", "district", "detail"]
      .map((key) => parsed[key])
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0
      );
    return parts.length > 0 ? parts.join(" ") : value;
  } catch {
    return value;
  }
};

const resolveStatus = (value?: number | null): WaybillStatus =>
  isKnownWaybillStatus(value) ? value : 0;

export const toWaybill = (dto: TmsWaybillDTO): Waybill => {
  const status = resolveStatus(dto.status);
  return {
    id: dto.id,
    waybillNo: dto.waybillNo ?? "-",
    orderId: dto.orderId ?? undefined,
    orderNo: dto.orderNo ?? "-",
    carrierId: dto.carrierId ?? undefined,
    carrierName: dto.carrierName ?? "-",
    // tms_waybill 只保存一个运单号，它本身就是承运商跟踪号。
    trackingNo: dto.waybillNo ?? "-",
    status,
    statusLabel: waybillStatusMeta(status).label,
    senderName: dto.senderName ?? "-",
    senderPhone: dto.senderPhone ?? undefined,
    senderAddress: formatAddress(dto.senderAddress),
    receiverName: dto.receiverName ?? "-",
    receiverPhone: dto.receiverPhone ?? undefined,
    receiverAddress: formatAddress(dto.receiverAddress),
    goodsName: dto.goodsName ?? undefined,
    goodsWeight: dto.goodsWeight ?? undefined,
    goodsVolume: dto.goodsVolume ?? undefined,
    freightAmount: dto.freightAmount ?? undefined,
    insuranceAmount: dto.insuranceAmount ?? undefined,
    courierName: dto.courierName ?? undefined,
    courierPhone: dto.courierPhone ?? undefined,
    signTime: dto.signTime ?? undefined,
    exceptionReason: dto.exceptionReason ?? undefined,
    estimatedDelivery: dto.estimatedDelivery ?? undefined,
    actualDelivery: dto.actualDelivery ?? undefined,
    createdAt: formatDate(dto.createTime),
    updatedAt: dto.updateTime ?? undefined,
    remark: dto.remark ?? undefined,
  };
};

export const toWaybillPage = (
  page: TmsWaybillPage | null | undefined
): { records: Waybill[]; total: number } => ({
  records: (page?.records ?? []).map(toWaybill),
  total: page?.total ?? 0,
});

export const toTrackingEvent = (dto: TmsTrackingDTO): TrackingEvent => ({
  id: dto.id,
  time: formatDateTime(dto.trackTime),
  rawTime: dto.trackTime ?? undefined,
  location: dto.location ?? "-",
  description: dto.description ?? "-",
  status: dto.trackStatus ?? "",
  statusLabel: trackingStatusLabel(dto.trackStatus),
  operator: dto.operator ?? undefined,
  source: dto.source ?? undefined,
});

export const toFreightQuote = (dto: TmsFreightQuoteDTO | null | undefined): FreightQuote => ({
  actualWeight: num(dto?.actualWeight),
  volumetricWeight: num(dto?.volumetricWeight),
  chargeableWeight: num(dto?.chargeableWeight),
  billedWeight: num(dto?.billedWeight),
  firstWeightFee: num(dto?.firstWeightFee),
  additionalFee: num(dto?.additionalFee),
  regionSurcharge: num(dto?.regionSurcharge),
  totalAmount: num(dto?.totalAmount),
});

export const toFreightTemplate = (dto: TmsFreightTemplateDTO) => ({
  id: dto.id,
  templateName: dto.templateName ?? undefined,
  carrierId: dto.carrierId ?? undefined,
  regionCode: dto.regionCode ?? undefined,
  regionName: dto.regionName ?? undefined,
  firstWeightKg: dto.firstWeightKg ?? undefined,
  firstWeightFee: dto.firstWeightFee ?? undefined,
  additionalUnitKg: dto.additionalUnitKg ?? undefined,
  additionalUnitFee: dto.additionalUnitFee ?? undefined,
  volumeDivisor: dto.volumeDivisor ?? undefined,
  regionSurcharge: dto.regionSurcharge ?? undefined,
  minCharge: dto.minCharge ?? undefined,
  enabled: dto.enabled ?? undefined,
});

const DIFF_TYPES: FreightDiffType[] = ["MATCH", "OVERCHARGE", "UNDERCHARGE"];
const RECONCILIATION_STATUSES: ReconciliationStatus[] = ["OPEN", "CONFIRMED"];

const toDiffType = (value?: string | null): FreightDiffType =>
  DIFF_TYPES.includes(value as FreightDiffType)
    ? (value as FreightDiffType)
    : "MATCH";

const toReconciliationStatus = (value?: string | null): ReconciliationStatus =>
  RECONCILIATION_STATUSES.includes(value as ReconciliationStatus)
    ? (value as ReconciliationStatus)
    : "OPEN";

export const toFreightReconciliation = (
  dto: TmsFreightReconciliationDTO
): FreightReconciliation => ({
  id: dto.id,
  batchNo: dto.batchNo ?? "-",
  waybillId: dto.waybillId ?? "-",
  waybillNo: dto.waybillNo ?? "-",
  carrierId: dto.carrierId ?? undefined,
  regionCode: dto.regionCode ?? undefined,
  actualWeight: dto.actualWeight ?? undefined,
  volume: dto.volume ?? undefined,
  chargeableWeight: dto.chargeableWeight ?? undefined,
  expectedAmount: num(dto.expectedAmount),
  billedAmount: num(dto.billedAmount),
  diffAmount: num(dto.diffAmount),
  diffType: toDiffType(dto.diffType),
  status: toReconciliationStatus(dto.status),
  createTime: dto.createTime ?? undefined,
  remark: dto.remark ?? undefined,
});

export const toFreightReconciliationPage = (
  page: TmsFreightReconciliationPage | null | undefined
): { records: FreightReconciliation[]; total: number } => ({
  records: (page?.records ?? []).map(toFreightReconciliation),
  total: page?.total ?? 0,
});
