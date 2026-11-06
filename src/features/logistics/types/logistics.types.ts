/** Mirrors `com.cognora.lms.logistics.domain.WaybillStatus` (0–6). */
export type WaybillStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Waybill {
  id: string
  waybillNo: string
  orderId?: string
  orderNo: string
  carrierId?: string
  carrierName: string
  trackingNo: string
  status: WaybillStatus
  statusLabel: string
  senderName: string
  senderPhone?: string
  senderAddress: string
  receiverName: string
  receiverPhone?: string
  receiverAddress: string
  goodsName?: string
  goodsWeight?: number
  goodsVolume?: number
  freightAmount?: number
  insuranceAmount?: number
  courierName?: string
  courierPhone?: string
  signTime?: string
  exceptionReason?: string
  estimatedDelivery?: string
  actualDelivery?: string
  createdAt: string
  updatedAt?: string
  remark?: string
}

export interface TrackingEvent {
  id: string
  time: string
  rawTime?: string
  location: string
  description: string
  /** Raw carrier status code, e.g. `PICKED_UP`. */
  status: string
  /** Human label resolved from the backend mapping. */
  statusLabel: string
  operator?: string
  source?: string
}

/** `com.cognora.lms.logistics.domain.freight.FreightQuote`. */
export interface FreightQuote {
  actualWeight: number
  volumetricWeight: number
  chargeableWeight: number
  billedWeight: number
  firstWeightFee: number
  additionalFee: number
  regionSurcharge: number
  totalAmount: number
}

/** `com.cognora.lms.logistics.domain.entity.TmsFreightTemplate`. */
export interface FreightTemplate {
  id: string
  templateName?: string
  carrierId?: string
  regionCode?: string
  regionName?: string
  firstWeightKg?: number
  firstWeightFee?: number
  additionalUnitKg?: number
  additionalUnitFee?: number
  volumeDivisor?: number
  regionSurcharge?: number
  minCharge?: number
  enabled?: boolean
}

export type FreightDiffType = 'MATCH' | 'OVERCHARGE' | 'UNDERCHARGE'

export type ReconciliationStatus = 'OPEN' | 'CONFIRMED'

/** `com.cognora.lms.logistics.domain.entity.TmsFreightReconciliation`. */
export interface FreightReconciliation {
  id: string
  batchNo: string
  waybillId: string
  waybillNo: string
  carrierId?: string
  regionCode?: string
  actualWeight?: number
  volume?: number
  chargeableWeight?: number
  expectedAmount: number
  billedAmount: number
  /** billed - expected; positive means the carrier overcharged. */
  diffAmount: number
  diffType: FreightDiffType
  status: ReconciliationStatus
  createTime?: string
  remark?: string
}
