import { describe, expect, it } from 'vitest'

import {
  allowedTargets,
  canTransition,
  isCancellable,
  isTerminalStatus,
  trackingStatusLabel,
  transitionBlockedReason,
  WAYBILL_STATUS_META,
  waybillStatusMeta,
} from './waybill-status'

describe('WaybillStatus mapping', () => {
  it('exposes the backend 0–6 codes with their names', () => {
    expect(Object.keys(WAYBILL_STATUS_META)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ])
    expect(waybillStatusMeta(0).label).toBe('待揽件')
    expect(waybillStatusMeta(1).label).toBe('已揽件')
    expect(waybillStatusMeta(2).label).toBe('运输中')
    expect(waybillStatusMeta(3).label).toBe('派送中')
    expect(waybillStatusMeta(4).label).toBe('已签收')
    expect(waybillStatusMeta(5).label).toBe('异常')
    expect(waybillStatusMeta(6).label).toBe('退回/取消')
  })

  it('mirrors the backend transition whitelist', () => {
    expect(allowedTargets(0)).toEqual([1, 6])
    expect(allowedTargets(1)).toEqual([2, 5, 6])
    expect(allowedTargets(2)).toEqual([3, 5, 6])
    expect(allowedTargets(3)).toEqual([4, 5, 6])
    expect(allowedTargets(4)).toEqual([])
    expect(allowedTargets(5)).toEqual([2, 3, 4, 6])
    expect(allowedTargets(6)).toEqual([])
  })

  it('treats 4 and 6 as terminal and blocks further moves', () => {
    expect(isTerminalStatus(4)).toBe(true)
    expect(isTerminalStatus(6)).toBe(true)
    expect(isTerminalStatus(0)).toBe(false)
    expect(canTransition(4, 2)).toBe(false)
    expect(canTransition(6, 1)).toBe(false)
    expect(canTransition(0, 1)).toBe(true)
    expect(canTransition(5, 2)).toBe(true)
  })

  it('reports why a target button is disabled', () => {
    expect(transitionBlockedReason(0, 1)).toBeNull()
    expect(transitionBlockedReason(0, 3)).toContain('不允许流转')
    expect(transitionBlockedReason(4, 2)).toContain('终态')
    expect(transitionBlockedReason(3, 3)).toContain('已处于该状态')
  })

  it('allows cancellation only before dispatch completes', () => {
    expect(isCancellable(0)).toBe(true)
    expect(isCancellable(2)).toBe(true)
    expect(isCancellable(3)).toBe(false)
    expect(isCancellable(4)).toBe(false)
  })

  it('maps carrier tracking codes to Chinese labels', () => {
    expect(trackingStatusLabel('PICKED_UP')).toBe('已揽件')
    expect(trackingStatusLabel('OUT_FOR_DELIVERY')).toBe('派送中')
    expect(trackingStatusLabel('delivered')).toBe('已签收')
    expect(trackingStatusLabel('CUSTOM')).toBe('CUSTOM')
    expect(trackingStatusLabel(null)).toBe('轨迹更新')
  })
})
