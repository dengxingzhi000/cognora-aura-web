import type { MpPage } from "./page";

/**
 * `com.cognora.lms.logistics.domain.entity.TmsWaybill`.
 * Status is the backend `WaybillStatus` code 0–6, never a display string.
 */
export interface TmsWaybillDTO {
  id: string;
  waybillNo?: string | null;
  carrierId?: string | null;
  carrierName?: string | null;
  orderId?: string | null;
  orderNo?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  /** JSONB object serialized as a string. */
  senderAddress?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  /** JSONB object serialized as a string. */
  receiverAddress?: string | null;
  goodsName?: string | null;
  goodsWeight?: number | null;
  goodsVolume?: number | null;
  goodsValue?: number | null;
  freightAmount?: number | null;
  insuranceAmount?: number | null;
  status?: number | null;
  courierId?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
  signType?: string | null;
  signPerson?: string | null;
  signTime?: string | null;
  exceptionType?: string | null;
  exceptionReason?: string | null;
  estimatedDelivery?: string | null;
  actualDelivery?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
  remark?: string | null;
}

/** `com.cognora.lms.logistics.domain.entity.TmsTracking`. */
export interface TmsTrackingDTO {
  id: string;
  waybillId?: string | null;
  waybillNo?: string | null;
  trackTime?: string | null;
  location?: string | null;
  description?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  trackStatus?: string | null;
  operator?: string | null;
  /** Carrier feed or manual entry, e.g. `CARRIER` / `MANUAL`. */
  source?: string | null;
  extraData?: string | null;
  createTime?: string | null;
}

/** `com.cognora.lms.logistics.domain.entity.TmsCarrier`. */
export interface TmsCarrierDTO {
  tenantId?: string | null;
  id: string;
  carrierCode?: string | null;
  carrierName?: string | null;
  carrierType?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  apiUrl?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  serviceArea?: string | null;
  serviceTypes?: string | null;
  baseRate?: number | null;
  enabled?: boolean | null;
  sortOrder?: number | null;
  createTime?: string | null;
  createBy?: string | null;
  updateTime?: string | null;
  updateBy?: string | null;
  deleted?: boolean | null;
  remark?: string | null;
}

/** `com.cognora.lms.logistics.domain.freight.FreightQuote`. */
export interface TmsFreightQuoteDTO {
  actualWeight?: number | null;
  volumetricWeight?: number | null;
  chargeableWeight?: number | null;
  billedWeight?: number | null;
  firstWeightFee?: number | null;
  additionalFee?: number | null;
  regionSurcharge?: number | null;
  totalAmount?: number | null;
}

/** `com.cognora.lms.logistics.domain.dto.FreightQuoteRequest`. */
export interface TmsFreightQuoteRequest {
  carrierId: string;
  regionCode?: string;
  weight: number;
  volume: number;
}

/** `com.cognora.lms.logistics.domain.dto.FreightReconcileRequest`. */
export interface TmsFreightReconcileRequest {
  waybillId: string;
  regionCode?: string;
  billedAmount: number;
  batchNo?: string;
  operator?: string;
}

/** `com.cognora.lms.logistics.domain.entity.TmsFreightTemplate`. */
export interface TmsFreightTemplateDTO {
  id: string;
  templateName?: string | null;
  carrierId?: string | null;
  /** Province/region code; `DEFAULT` is the fallback template. */
  regionCode?: string | null;
  regionName?: string | null;
  firstWeightKg?: number | null;
  firstWeightFee?: number | null;
  additionalUnitKg?: number | null;
  additionalUnitFee?: number | null;
  volumeDivisor?: number | null;
  regionSurcharge?: number | null;
  minCharge?: number | null;
  enabled?: boolean | null;
  createTime?: string | null;
  updateTime?: string | null;
  remark?: string | null;
}

/** `com.cognora.lms.logistics.domain.entity.TmsFreightReconciliation`. */
export interface TmsFreightReconciliationDTO {
  id: string;
  batchNo?: string | null;
  waybillId?: string | null;
  waybillNo?: string | null;
  carrierId?: string | null;
  regionCode?: string | null;
  actualWeight?: number | null;
  volume?: number | null;
  chargeableWeight?: number | null;
  expectedAmount?: number | null;
  billedAmount?: number | null;
  /** billed - expected; positive means the carrier overcharged. */
  diffAmount?: number | null;
  /** MATCH / OVERCHARGE / UNDERCHARGE. */
  diffType?: string | null;
  /** OPEN / CONFIRMED. */
  status?: string | null;
  createTime?: string | null;
  remark?: string | null;
}

export type TmsWaybillPage = MpPage<TmsWaybillDTO>;
export type TmsTrackingPage = MpPage<TmsTrackingDTO>;
export type TmsCarrierPage = MpPage<TmsCarrierDTO>;
export type TmsFreightReconciliationPage = MpPage<TmsFreightReconciliationDTO>;

export interface TmsWaybillQuery {
  page: number;
  size: number;
  waybillNo?: string;
  /** Backend `WaybillStatus` code. */
  status?: number;
  carrierId?: string;
}

export interface TmsTrackingQuery {
  page: number;
  size: number;
  waybillNo?: string;
  trackStatus?: string;
}

export interface TmsCarrierQuery {
  page: number;
  size: number;
  carrierName?: string;
  carrierType?: number;
  enabled?: boolean;
}

export interface TmsFreightReconciliationQuery {
  page: number;
  size: number;
  batchNo?: string;
  diffType?: string;
  status?: string;
}

export const CARRIER_TYPE: Record<number, string> = {
  1: "快递",
  2: "物流",
  3: "同城配送",
  4: "自营配送",
};
