import { describe, expect, it } from 'vitest'

import type {
  ReplenishmentSuggestion,
  ReplenishmentSuggestionItem,
} from '@/lib/api/contracts/inventory-replenishment'
import {
  parseFlags,
  toDemandForecastRow,
  toReplenishmentComputeSummary,
  toReplenishmentSuggestionPage,
  toReplenishmentSuggestionRow,
  toReplenishmentItemRow,
  toStatusLabel,
} from './replenishment.mappers'

/**
 * 这些断言集中保护两件容易出错、且出错后果严重的事：
 * 1. 状态机派生出的按钮开关（`editable` / `decidable` / `convertible`）——
 *    算错会让用户在错误的时机点采纳或转单；
 * 2. 提示位解析——后端是逗号分隔字符串，解析错会让「需人工确认」这类关键警示消失。
 */

const baseSuggestion: ReplenishmentSuggestion = {
  id: 'rp-1',
  suggestionNo: 'RP20261110-ABC123',
  warehouseId: 'wh-1',
  period: '2026-W45',
  status: 'DRAFT',
  businessKey: 'tenant|wh-1|2026-W45',
  itemCount: 2,
  totalSuggestedQty: 120,
  totalAdoptedQty: null,
  purPlanId: null,
  purPlanNo: null,
  convertError: null,
  rejectReason: null,
  remark: null,
  createdBy: 'user-1',
  adoptedBy: null,
  adoptedAt: null,
  convertedAt: null,
  createTime: '2026-11-10T12:00:00',
  updateTime: '2026-11-10T12:00:00',
}

const baseItem: ReplenishmentSuggestionItem = {
  id: 'item-1',
  skuId: 'sku-1',
  warehouseId: 'wh-1',
  availableStock: 30,
  inTransitQty: 20,
  reorderPoint: 100,
  safetyStock: 30,
  targetStock: 170,
  suggestedQty: 120,
  adoptedQty: null,
  supplierId: null,
  flags: null,
  reasonSnapshot: '触发补货：可用+在途 50 ≤ ROP 100',
  effectiveQty: 120,
  adjusted: false,
}

describe('parseFlags', () => {
  it('splits the comma separated string into labelled flags', () => {
    const flags = parseFlags('NEEDS_MANUAL,CAPPED_BY_BUDGET')

    expect(flags).toHaveLength(2)
    expect(flags[0]).toMatchObject({ key: 'NEEDS_MANUAL', label: '需人工确认', tone: 'warning' })
    expect(flags[1]).toMatchObject({ key: 'CAPPED_BY_BUDGET', label: '受预算限制', tone: 'secondary' })
  })

  it('tolerates whitespace around each flag', () => {
    expect(parseFlags(' NEEDS_MANUAL , NO_SUPPLIER ').map((f) => f.key)).toEqual([
      'NEEDS_MANUAL',
      'NO_SUPPLIER',
    ])
  })

  it('ignores unknown flags so a newer backend cannot break the screen', () => {
    // 后端将来可能新增标记；旧前端必须静默忽略而不是渲染原始英文枚举
    const flags = parseFlags('NEEDS_MANUAL,FUTURE_FLAG')

    expect(flags).toHaveLength(1)
    expect(flags[0].key).toBe('NEEDS_MANUAL')
  })

  it('returns an empty list for null, undefined and empty strings', () => {
    expect(parseFlags(null)).toEqual([])
    expect(parseFlags(undefined)).toEqual([])
    expect(parseFlags('')).toEqual([])
    expect(parseFlags('   ')).toEqual([])
  })
})

describe('toStatusLabel', () => {
  it('maps every state of the machine to Chinese', () => {
    expect(toStatusLabel('DRAFT')).toBe('草稿')
    expect(toStatusLabel('ADOPTED')).toBe('已采纳')
    expect(toStatusLabel('CONVERTED')).toBe('已转采购计划')
    expect(toStatusLabel('REJECTED')).toBe('已驳回')
    expect(toStatusLabel('CANCELLED')).toBe('已取消')
  })

  it('falls back to the raw value for an unknown status', () => {
    expect(toStatusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })
})

describe('toReplenishmentSuggestionRow', () => {
  it('only a DRAFT can be edited, decided or rejected', () => {
    const row = toReplenishmentSuggestionRow(baseSuggestion)

    expect(row.editable).toBe(true)
    expect(row.decidable).toBe(true)
    // ADOPTED 之前不能转单
    expect(row.convertible).toBe(false)
  })

  it('only an ADOPTED suggestion can be converted', () => {
    const row = toReplenishmentSuggestionRow({ ...baseSuggestion, status: 'ADOPTED' })

    expect(row.editable).toBe(false)
    expect(row.decidable).toBe(false)
    expect(row.convertible).toBe(true)
  })

  it('terminal states allow nothing', () => {
    for (const status of ['CONVERTED', 'REJECTED', 'CANCELLED'] as const) {
      const row = toReplenishmentSuggestionRow({ ...baseSuggestion, status })

      expect(row.editable, status).toBe(false)
      expect(row.decidable, status).toBe(false)
      expect(row.convertible, status).toBe(false)
    }
  })

  it('falls back to the suggested quantity when nothing was adopted', () => {
    const row = toReplenishmentSuggestionRow(baseSuggestion)

    expect(row.totalAdoptedQty).toBe(0)
    expect(row.effectiveQty).toBe(120)
  })

  it('prefers the adopted total once the reviewer changed it', () => {
    const row = toReplenishmentSuggestionRow({
      ...baseSuggestion,
      status: 'ADOPTED',
      totalSuggestedQty: 120,
      totalAdoptedQty: 90,
    })

    expect(row.effectiveQty).toBe(90)
  })

  it('surfaces the conversion failure so the reviewer can retry', () => {
    const row = toReplenishmentSuggestionRow({
      ...baseSuggestion,
      status: 'ADOPTED',
      convertError: 'SKU→material 映射缺失',
    })

    expect(row.convertError).toBe('SKU→material 映射缺失')
    expect(row.convertible).toBe(true)
  })

  it('maps the nested items when the detail endpoint returns them', () => {
    const row = toReplenishmentSuggestionRow({
      ...baseSuggestion,
      items: [baseItem],
    })

    expect(row.items).toHaveLength(1)
    expect(row.items?.[0].suggestedQty).toBe(120)
  })

  it('leaves items undefined for the list endpoint', () => {
    expect(toReplenishmentSuggestionRow(baseSuggestion).items).toBeUndefined()
  })
})

describe('toReplenishmentItemRow', () => {
  it('keeps the frozen calculation snapshot intact', () => {
    const row = toReplenishmentItemRow(baseItem)

    expect(row.availableStock).toBe(30)
    expect(row.inTransitQty).toBe(20)
    expect(row.reorderPoint).toBe(100)
    expect(row.targetStock).toBe(170)
    expect(row.reason).toContain('ROP 100')
  })

  it('treats a null adopted quantity as "not adjusted"', () => {
    const row = toReplenishmentItemRow(baseItem)

    expect(row.adoptedQty).toBeNull()
    expect(row.adjusted).toBe(false)
    expect(row.effectiveQty).toBe(120)
  })

  it('marks a manually changed quantity', () => {
    const row = toReplenishmentItemRow({
      ...baseItem,
      adoptedQty: 100,
      effectiveQty: 100,
      adjusted: true,
    })

    expect(row.adjusted).toBe(true)
    expect(row.effectiveQty).toBe(100)
  })

  it('parses the flags of an item', () => {
    const row = toReplenishmentItemRow({ ...baseItem, flags: 'NEEDS_MANUAL,ROUNDED_TO_MOQ' })

    expect(row.flags.map((f) => f.key)).toEqual(['NEEDS_MANUAL', 'ROUNDED_TO_MOQ'])
  })
})

describe('toReplenishmentSuggestionPage', () => {
  it('maps a MyBatis-Plus page echo into PageResult records', () => {
    const page = toReplenishmentSuggestionPage({
      records: [baseSuggestion],
      total: 7,
      size: 20,
      current: 2,
    })

    expect(page.records).toHaveLength(1)
    expect(page.total).toBe(7)
    expect(page.current).toBe(2)
    expect(page.pageSize).toBe(20)
  })

  it('survives a null page without throwing', () => {
    const page = toReplenishmentSuggestionPage(null)

    expect(page.records).toEqual([])
    expect(page.total).toBe(0)
  })
})

describe('toReplenishmentComputeSummary', () => {
  it('maps counts and preview lines', () => {
    const summary = toReplenishmentComputeSummary({
      period: '2026-W45',
      scannedInventories: 40,
      triggeredItems: 3,
      skippedItems: 37,
      needsManualItems: 1,
      totalSuggestedQty: 210,
      businessKey: 'tenant|ALL|2026-W45',
      existingSuggestionId: null,
      dryRun: true,
      lines: [
        {
          skuId: 'sku-1',
          warehouseId: 'wh-1',
          availableStock: 30,
          inTransitQty: 20,
          reorderPoint: 100,
          safetyStock: 30,
          targetStock: 170,
          suggestedQty: 120,
          flags: 'CAPPED_BY_CAPACITY',
          reason: '仓容上限裁剪到 120',
        },
      ],
    })

    expect(summary.scannedInventories).toBe(40)
    expect(summary.dryRun).toBe(true)
    expect(summary.lines[0].flags).toHaveLength(1)
    expect(summary.lines[0].reason).toBe('仓容上限裁剪到 120')
  })

  it('reports an idempotent hit so the UI can say "not created again"', () => {
    const summary = toReplenishmentComputeSummary({
      period: '2026-W45',
      scannedInventories: 0,
      triggeredItems: 0,
      skippedItems: 0,
      needsManualItems: 0,
      totalSuggestedQty: 0,
      businessKey: 'tenant|ALL|2026-W45',
      existingSuggestionId: 'rp-9',
      dryRun: false,
      lines: [],
    })

    expect(summary.existingSuggestionId).toBe('rp-9')
  })
})

describe('toDemandForecastRow', () => {
  it('marks LOW_CONFIDENCE so the reviewer knows the sample is thin', () => {
    const row = toDemandForecastRow({
      id: 'fc-1',
      skuId: 'sku-1',
      warehouseId: 'wh-1',
      forecastDate: '2026-11-10',
      dailyDemand: 10,
      demandStdDev: 0,
      mape: null,
      method: 'WEIGHTED_MOVING_AVERAGE',
      confidence: 'LOW_CONFIDENCE',
      sampleDays: 2,
      version: 1,
      createTime: '2026-11-10T12:00:00',
    })

    expect(row.lowConfidence).toBe(true)
    expect(row.dailyDemand).toBe(10)
    expect(row.mape).toBeNull()
  })

  it('keeps a normal confidence unmarked', () => {
    const row = toDemandForecastRow({
      id: 'fc-2',
      skuId: 'sku-1',
      warehouseId: 'wh-1',
      forecastDate: '2026-11-10',
      dailyDemand: 4.5,
      demandStdDev: 1.2,
      mape: 0.18,
      method: 'WEIGHTED_MOVING_AVERAGE',
      confidence: 'NORMAL',
      sampleDays: 28,
      version: 2,
      createTime: '2026-11-10T12:00:00',
    })

    expect(row.lowConfidence).toBe(false)
    expect(row.mape).toBe(0.18)
  })
})
