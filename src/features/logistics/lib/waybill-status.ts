import type { WaybillStatus } from '../types'

type BadgeVariant = 'success' | 'warning' | 'info' | 'destructive' | 'secondary'

interface WaybillStatusMeta {
  label: string
  variant: BadgeVariant
  accent: string
  terminal: boolean
}

/**
 * Mirrors `com.cognora.lms.logistics.domain.WaybillStatus`.
 * Keep the labels and the transition whitelist in sync with the backend —
 * the UI must never offer a move the server would reject.
 */
export const WAYBILL_STATUS_META: Record<WaybillStatus, WaybillStatusMeta> = {
  0: { label: '待揽件', variant: 'secondary', accent: 'var(--color-border-strong)', terminal: false },
  1: { label: '已揽件', variant: 'info', accent: 'var(--color-info)', terminal: false },
  2: { label: '运输中', variant: 'info', accent: 'var(--color-info)', terminal: false },
  3: { label: '派送中', variant: 'info', accent: 'var(--color-info)', terminal: false },
  4: { label: '已签收', variant: 'success', accent: 'var(--color-success)', terminal: true },
  5: { label: '异常', variant: 'destructive', accent: 'var(--color-error)', terminal: false },
  6: { label: '退回/取消', variant: 'secondary', accent: 'var(--color-border-strong)', terminal: true },
}

const WAYBILL_STATUS_CODES: WaybillStatus[] = [0, 1, 2, 3, 4, 5, 6]

export const WAYBILL_STATUS_OPTIONS = WAYBILL_STATUS_CODES.map((value) => ({
  value,
  label: WAYBILL_STATUS_META[value].label,
}))

export const ALL_WAYBILL_STATUS_CODES = WAYBILL_STATUS_CODES

/** Hand-driven transitions; `WaybillStatus.ALLOWED` in the backend. */
const ALLOWED_TRANSITIONS: Record<WaybillStatus, readonly WaybillStatus[]> = {
  0: [1, 6],
  1: [2, 5, 6],
  2: [3, 5, 6],
  3: [4, 5, 6],
  4: [],
  5: [2, 3, 4, 6],
  6: [],
}

/** `WaybillStatus.CANCELLABLE`: anything not yet delivered and not returned. */
const CANCELLABLE: readonly WaybillStatus[] = [0, 1, 2, 5]

export const isKnownWaybillStatus = (value: unknown): value is WaybillStatus =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6

export const waybillStatusMeta = (status: WaybillStatus): WaybillStatusMeta =>
  WAYBILL_STATUS_META[status] ?? WAYBILL_STATUS_META[0]

export const isTerminalStatus = (status: WaybillStatus): boolean =>
  waybillStatusMeta(status).terminal

export const allowedTargets = (status: WaybillStatus): readonly WaybillStatus[] =>
  ALLOWED_TRANSITIONS[status] ?? []

export const canTransition = (from: WaybillStatus, to: WaybillStatus): boolean =>
  from === to || allowedTargets(from).includes(to)

export const isCancellable = (status: WaybillStatus): boolean => CANCELLABLE.includes(status)

/**
 * Why a target button is disabled. `null` means the move is allowed.
 * This mirrors the messages `WaybillStatus.assertTransitionAllowed` raises.
 */
export const transitionBlockedReason = (
  from: WaybillStatus,
  to: WaybillStatus
): string | null => {
  if (to === from) return '运单已处于该状态'
  if (isTerminalStatus(from)) {
    return `运单已处于终态「${waybillStatusMeta(from).label}」，不允许继续流转`
  }
  if (!allowedTargets(from).includes(to)) {
    return `当前状态「${waybillStatusMeta(from).label}」不允许流转到「${waybillStatusMeta(to).label}」`
  }
  return null
}

/** Carrier `track_status` values understood by `WaybillStatus.fromTrackingEvent`. */
const TRACKING_STATUS_LABELS: Record<string, string> = {
  PICKED_UP: '已揽件',
  PICKED: '已揽件',
  COLLECTED: '已揽件',
  揽件: '已揽件',
  已揽件: '已揽件',
  IN_TRANSIT: '运输中',
  TRANSPORTING: '运输中',
  运输中: '运输中',
  OUT_FOR_DELIVERY: '派送中',
  DELIVERING: '派送中',
  DISPATCHED: '派送中',
  派送中: '派送中',
  DELIVERED: '已签收',
  SIGNED: '已签收',
  已签收: '已签收',
  EXCEPTION: '异常',
  FAILED: '异常',
  REJECTED: '异常',
  异常: '异常',
  RETURNED: '退回',
  RETURN: '退回',
  退回: '退回',
}

export const trackingStatusLabel = (status?: string | null): string => {
  if (!status) return '轨迹更新'
  const key = status.trim()
  return TRACKING_STATUS_LABELS[key.toUpperCase()] ?? TRACKING_STATUS_LABELS[key] ?? key
}
