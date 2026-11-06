import { describe, expect, it } from 'vitest'

import {
  toFreightQuote,
  toFreightReconciliation,
  toFreightReconciliationPage,
  toFreightTemplate,
  toTrackingEvent,
  toWaybill,
  toWaybillPage,
} from './mappers'

describe('logistics mappers', () => {
  it('keeps the numeric backend status and resolves its label', () => {
    const waybill = toWaybill({
      id: 'wb-1',
      waybillNo: 'WB-001',
      orderNo: 'SO-001',
      status: 2,
      signTime: '2026-11-06T03:20:00Z',
      createTime: '2026-11-05T02:00:00Z',
    })
    expect(waybill.status).toBe(2)
    expect(waybill.statusLabel).toBe('运输中')
    expect(waybill.trackingNo).toBe('WB-001')
    expect(waybill.createdAt).toBe('2026-11-05')
  })

  it('falls back to 待揽件 for an unknown status code', () => {
    const waybill = toWaybill({ id: 'wb-2', status: 99 })
    expect(waybill.status).toBe(0)
    expect(waybill.statusLabel).toBe('待揽件')
  })

  it('flattens JSONB address objects and tolerates malformed values', () => {
    const address = JSON.stringify({
      province: '上海市',
      city: '上海市',
      district: '浦东新区',
      detail: '张江路 1 号',
    })
    expect(toWaybill({ id: 'wb-3', senderAddress: address }).senderAddress).toBe(
      '上海市 上海市 浦东新区 张江路 1 号'
    )
    expect(toWaybill({ id: 'wb-4', receiverAddress: 'raw address' }).receiverAddress).toBe(
      'raw address'
    )
  })

  it('maps a page envelope', () => {
    const page = toWaybillPage({
      records: [{ id: 'a', status: 4 }],
      total: 9,
      size: 20,
      current: 1,
    })
    expect(page.total).toBe(9)
    expect(page.records[0].statusLabel).toBe('已签收')
  })

  it('carries the tracking source and resolved status label', () => {
    const event = toTrackingEvent({
      id: 'tr-1',
      trackTime: '2026-11-06T04:10:00Z',
      trackStatus: 'OUT_FOR_DELIVERY',
      source: 'CARRIER',
      operator: 'courier',
      location: '上海市',
      description: '快件派送中',
    })
    expect(event.statusLabel).toBe('派送中')
    expect(event.source).toBe('CARRIER')
    expect(event.operator).toBe('courier')
    expect(event.time).toBe('2026-11-06 12:10')
  })

  it('maps freight split amounts and templates', () => {
    const quote = toFreightQuote({
      actualWeight: 2.4,
      volumetricWeight: 3.1,
      chargeableWeight: 3.1,
      billedWeight: 3.5,
      firstWeightFee: 10,
      additionalFee: 6,
      regionSurcharge: 2,
      totalAmount: 18,
    })
    expect(quote).toEqual({
      actualWeight: 2.4,
      volumetricWeight: 3.1,
      chargeableWeight: 3.1,
      billedWeight: 3.5,
      firstWeightFee: 10,
      additionalFee: 6,
      regionSurcharge: 2,
      totalAmount: 18,
    })

    const template = toFreightTemplate({
      id: 'tpl-1',
      regionCode: 'DEFAULT',
      firstWeightKg: 1,
      firstWeightFee: 10,
      additionalUnitKg: 1,
      additionalUnitFee: 2,
      volumeDivisor: 6000,
      regionSurcharge: 2,
      minCharge: 12,
    })
    expect(template.minCharge).toBe(12)
    expect(template.volumeDivisor).toBe(6000)
  })

  it('maps reconciliation diff types and defaults unknown values', () => {
    const row = toFreightReconciliation({
      id: 're-1',
      waybillNo: 'WB-001',
      expectedAmount: 18,
      billedAmount: 22,
      diffAmount: 4,
      diffType: 'OVERCHARGE',
      status: 'OPEN',
    })
    expect(row.diffType).toBe('OVERCHARGE')
    expect(row.status).toBe('OPEN')

    const fallback = toFreightReconciliation({
      id: 're-2',
      diffType: 'UNKNOWN',
      status: 'UNKNOWN',
    })
    expect(fallback.diffType).toBe('MATCH')
    expect(fallback.status).toBe('OPEN')
  })

  it('maps a reconciliation page', () => {
    const page = toFreightReconciliationPage({
      records: [
        {
          id: 're-3',
          diffType: 'UNDERCHARGE',
          status: 'CONFIRMED',
          diffAmount: -2,
        },
      ],
      total: 1,
      size: 20,
      current: 1,
    })
    expect(page.total).toBe(1)
    expect(page.records[0].diffType).toBe('UNDERCHARGE')
  })
})
