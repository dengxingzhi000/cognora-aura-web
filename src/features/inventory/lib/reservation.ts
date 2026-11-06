import dayjs from 'dayjs'

import type {
  InventoryItem,
  ReservationRecord,
  ReservationStatusValue,
  StockMovement,
  StockMovementType,
} from '../types'

type BadgeVariant = 'success' | 'warning' | 'info' | 'destructive' | 'secondary'

interface ReservationStatusMeta {
  label: string
  variant: BadgeVariant
  /** Only RESERVED rows can still be confirmed or released. */
  actionable: boolean
  reason: string
}

export const RESERVATION_STATUS_META: Record<
  ReservationStatusValue,
  ReservationStatusMeta
> = {
  RESERVED: {
    label: '已预占',
    variant: 'info',
    actionable: true,
    reason: '预占仍在有效期内，可确认扣减或释放',
  },
  CONFIRMED: {
    label: '已确认',
    variant: 'success',
    actionable: false,
    reason: '预占已确认并原子扣减，终态不可再操作',
  },
  RELEASED: {
    label: '已释放',
    variant: 'secondary',
    actionable: false,
    reason: '预占已主动释放，终态不可再操作',
  },
  EXPIRED: {
    label: '已过期',
    variant: 'destructive',
    actionable: false,
    reason: '超过 900 秒有效期由后端自动释放，终态不可再操作',
  },
}

const RESERVATION_STATUS_VALUES: ReservationStatusValue[] = [
  'RESERVED',
  'CONFIRMED',
  'RELEASED',
  'EXPIRED',
]

export const RESERVATION_STATUS_OPTIONS = RESERVATION_STATUS_VALUES.map(
  (value) => ({ value, label: RESERVATION_STATUS_META[value].label })
)

export const canConfirmReservation = (status: ReservationStatusValue): boolean =>
  RESERVATION_STATUS_META[status].actionable

export const canReleaseReservation = (status: ReservationStatusValue): boolean =>
  RESERVATION_STATUS_META[status].actionable

export const reservationActionBlockedReason = (
  status: ReservationStatusValue
): string | null => (RESERVATION_STATUS_META[status].actionable ? null : RESERVATION_STATUS_META[status].reason)

/**
 * Mock rows used only to visualise the four DB states; the backend exposes no
 * reservation list endpoint. `demo: true` locks the action buttons so a fake
 * business key is never sent to the real confirm/release APIs.
 */
export const RESERVATION_DEMO_ROWS: ReservationRecord[] = [
  {
    businessKey: 'MOCK-SO-20261106-001',
    skuId: 'MOCK-SKU-1001',
    warehouseId: 'MOCK-WH-SH-01',
    quantity: 12,
    status: 'RESERVED',
    reservedAt: '2026-11-06 09:12',
    demo: true,
  },
  {
    businessKey: 'MOCK-SO-20261106-002',
    skuId: 'MOCK-SKU-1002',
    warehouseId: 'MOCK-WH-SH-01',
    quantity: 3,
    status: 'CONFIRMED',
    reservedAt: '2026-11-06 08:40',
    demo: true,
  },
  {
    businessKey: 'MOCK-SO-20261105-003',
    skuId: 'MOCK-SKU-1003',
    warehouseId: 'MOCK-WH-BJ-02',
    quantity: 8,
    status: 'RELEASED',
    reservedAt: '2026-11-05 17:25',
    demo: true,
  },
  {
    businessKey: 'MOCK-SO-20261105-004',
    skuId: 'MOCK-SKU-1001',
    warehouseId: 'MOCK-WH-SH-01',
    quantity: 5,
    status: 'EXPIRED',
    reservedAt: '2026-11-05 15:03',
    demo: true,
  },
]

export const toLookupRecord = (
  businessKey: string,
  exists: boolean,
  quantity: number | null
): ReservationRecord => ({
  businessKey,
  quantity: quantity ?? 0,
  status: 'RESERVED',
  reservedAt: exists ? dayjs().format('YYYY-MM-DD HH:mm') : undefined,
  demo: !exists,
})

/** Before/after preview shown in the adjust dialog before submit. */
export interface StockChangePreview {
  availableBefore: number
  availableAfter: number
  totalBefore: number
  totalAfter: number
}

export const previewAdjustment = (
  item: Pick<InventoryItem, 'availableStock' | 'totalStock'>,
  delta: number
): StockChangePreview => ({
  availableBefore: item.availableStock,
  availableAfter: item.availableStock + delta,
  totalBefore: item.totalStock,
  totalAfter: item.totalStock + delta,
})

export interface TransferPreview {
  sourceAvailableBefore: number
  sourceAvailableAfter: number
  quantity: number
  feasible: boolean
}

export const previewTransfer = (
  item: Pick<InventoryItem, 'availableStock'>,
  quantity: number
): TransferPreview => ({
  sourceAvailableBefore: item.availableStock,
  sourceAvailableAfter: item.availableStock - quantity,
  quantity,
  feasible: quantity > 0 && item.availableStock >= quantity,
})

export const MOVEMENT_TYPE_META: Record<
  StockMovementType,
  { label: string; variant: BadgeVariant; sign: '+' | '-' | '±' }
> = {
  INBOUND: { label: '入库', variant: 'success', sign: '+' },
  OUTBOUND: { label: '出库', variant: 'warning', sign: '-' },
  ADJUST: { label: '盘点调整', variant: 'info', sign: '±' },
  TRANSFER_OUT: { label: '调拨出库', variant: 'warning', sign: '-' },
  TRANSFER_IN: { label: '调拨入库', variant: 'success', sign: '+' },
  RESERVE: { label: '预占', variant: 'info', sign: '-' },
  RELEASE: { label: '释放', variant: 'secondary', sign: '+' },
}

/**
 * Mock ledger rows. `inv_log` exists in the database but no REST endpoint
 * exposes it, so the movements screen is explicitly labelled as mock data.
 */
export const STOCK_MOVEMENT_DEMO_ROWS: StockMovement[] = [
  {
    id: 'mv-001',
    skuId: 'MOCK-SKU-1001',
    warehouseId: 'MOCK-WH-SH-01',
    type: 'INBOUND',
    quantity: 100,
    availableBefore: 20,
    availableAfter: 120,
    referenceNo: 'PO-20261106-001',
    operator: 'warehouse-ui',
    occurredAt: '2026-11-06 09:30',
  },
  {
    id: 'mv-002',
    skuId: 'MOCK-SKU-1001',
    warehouseId: 'MOCK-WH-SH-01',
    type: 'RESERVE',
    quantity: 12,
    availableBefore: 120,
    availableAfter: 108,
    referenceNo: 'MOCK-SO-20261106-001',
    operator: 'order-service',
    occurredAt: '2026-11-06 09:12',
  },
  {
    id: 'mv-003',
    skuId: 'MOCK-SKU-1002',
    warehouseId: 'MOCK-WH-SH-01',
    type: 'OUTBOUND',
    quantity: 6,
    availableBefore: 30,
    availableAfter: 24,
    referenceNo: 'SO-20261106-002',
    operator: 'warehouse-ui',
    occurredAt: '2026-11-06 08:55',
  },
  {
    id: 'mv-004',
    skuId: 'MOCK-SKU-1003',
    warehouseId: 'MOCK-WH-BJ-02',
    type: 'TRANSFER_OUT',
    quantity: 8,
    availableBefore: 40,
    availableAfter: 32,
    referenceNo: 'TR-20261105-003',
    operator: 'warehouse-ui',
    occurredAt: '2026-11-05 17:20',
  },
  {
    id: 'mv-005',
    skuId: 'MOCK-SKU-1003',
    warehouseId: 'MOCK-WH-SH-01',
    type: 'TRANSFER_IN',
    quantity: 8,
    availableBefore: 10,
    availableAfter: 18,
    referenceNo: 'TR-20261105-003',
    operator: 'warehouse-ui',
    occurredAt: '2026-11-05 17:20',
  },
  {
    id: 'mv-006',
    skuId: 'MOCK-SKU-1002',
    warehouseId: 'MOCK-WH-SH-01',
    type: 'ADJUST',
    quantity: -2,
    availableBefore: 32,
    availableAfter: 30,
    referenceNo: 'ADJ-20261105-002',
    operator: 'inventory-ui',
    occurredAt: '2026-11-05 14:05',
  },
  {
    id: 'mv-007',
    skuId: 'MOCK-SKU-1001',
    warehouseId: 'MOCK-WH-SH-01',
    type: 'RELEASE',
    quantity: 5,
    availableBefore: 108,
    availableAfter: 113,
    referenceNo: 'MOCK-SO-20261105-004',
    operator: 'inventory-job',
    occurredAt: '2026-11-05 15:18',
  },
]
