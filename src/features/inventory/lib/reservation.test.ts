import { describe, expect, it } from 'vitest'

import {
  canConfirmReservation,
  canReleaseReservation,
  MOVEMENT_TYPE_META,
  previewAdjustment,
  previewTransfer,
  reservationActionBlockedReason,
  RESERVATION_DEMO_ROWS,
  RESERVATION_STATUS_META,
  toLookupRecord,
} from './reservation'

describe('reservation status model', () => {
  it('exposes the four backend states with their actionability', () => {
    expect(Object.keys(RESERVATION_STATUS_META)).toEqual([
      'RESERVED',
      'CONFIRMED',
      'RELEASED',
      'EXPIRED',
    ])
    expect(canConfirmReservation('RESERVED')).toBe(true)
    expect(canReleaseReservation('RESERVED')).toBe(true)
    expect(canConfirmReservation('CONFIRMED')).toBe(false)
    expect(canReleaseReservation('RELEASED')).toBe(false)
    expect(canReleaseReservation('EXPIRED')).toBe(false)
  })

  it('explains why a terminal row is not actionable', () => {
    expect(reservationActionBlockedReason('RESERVED')).toBeNull()
    expect(reservationActionBlockedReason('CONFIRMED')).toContain('终态')
    expect(reservationActionBlockedReason('RELEASED')).toContain('终态')
    expect(reservationActionBlockedReason('EXPIRED')).toContain('900 秒')
  })

  it('marks every demo row so fake business keys never hit the API', () => {
    expect(RESERVATION_DEMO_ROWS).toHaveLength(4)
    expect(RESERVATION_DEMO_ROWS.every((row) => row.demo)).toBe(true)
    expect(RESERVATION_DEMO_ROWS.map((row) => row.status)).toEqual([
      'RESERVED',
      'CONFIRMED',
      'RELEASED',
      'EXPIRED',
    ])
  })

  it('builds a real row only when the lookup found a reservation', () => {
    const record = toLookupRecord('SO-1', true, 7)
    expect(record.status).toBe('RESERVED')
    expect(record.quantity).toBe(7)
    expect(record.demo).toBe(false)

    const missing = toLookupRecord('SO-2', false, null)
    expect(missing.quantity).toBe(0)
    expect(missing.demo).toBe(true)
  })
})

describe('stock change previews', () => {
  it('adds a positive adjustment to available and total stock', () => {
    const preview = previewAdjustment({ availableStock: 10, totalStock: 12 }, 3)
    expect(preview).toEqual({
      availableBefore: 10,
      availableAfter: 13,
      totalBefore: 12,
      totalAfter: 15,
    })
  })

  it('subtracts a negative adjustment', () => {
    const preview = previewAdjustment({ availableStock: 10, totalStock: 12 }, -4)
    expect(preview.availableAfter).toBe(6)
    expect(preview.totalAfter).toBe(8)
  })

  it('rejects a transfer that exceeds the source available stock', () => {
    expect(previewTransfer({ availableStock: 10 }, 4)).toMatchObject({
      sourceAvailableBefore: 10,
      sourceAvailableAfter: 6,
      feasible: true,
    })
    expect(previewTransfer({ availableStock: 10 }, 11).feasible).toBe(false)
    expect(previewTransfer({ availableStock: 10 }, 0).feasible).toBe(false)
  })

  it('labels every ledger movement type', () => {
    expect(MOVEMENT_TYPE_META.RESERVE.label).toBe('预占')
    expect(MOVEMENT_TYPE_META.TRANSFER_IN.sign).toBe('+')
    expect(MOVEMENT_TYPE_META.OUTBOUND.sign).toBe('-')
  })
})
