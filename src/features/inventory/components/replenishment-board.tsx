'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TableEmpty,
  TableLoading,
  TablePanel,
  TableToolbar,
  TableToolbarEnd,
} from '@/components/ui/table-shell'
import { PermissionGate } from '@/components/ui/permission-gate'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermission } from '@/hooks/use-permission'
import ReplenishmentDetailDialog from './replenishment-detail-dialog'
import {
  useConvertReplenishment,
  useGenerateReplenishment,
  useReplenishmentSuggestions,
} from '../hooks'
import type { ReplenishmentStatus, ReplenishmentSuggestionRow } from '../types'

/**
 * 智能补货建议单列表。
 *
 * 页面职责刻意收窄到「看单 + 推进状态」：
 * 生成 → 人审（采纳/驳回）→ 转采购计划。改量在明细弹窗里做，
 * 因为改量需要看到 ROP/在途/决策快照才能判断，列表页给不出那个上下文。
 *
 * 状态机规则不在这里判断——`editable` / `decidable` / `convertible` 由 mapper 派生，
 * 这里只按派生字段决定按钮有无。
 */

const statusConfig: Record<
  ReplenishmentStatus,
  { variant: 'warning' | 'secondary' | 'default' | 'destructive'; accent: string }
> = {
  DRAFT: { variant: 'warning', accent: 'var(--color-warning)' },
  ADOPTED: { variant: 'default', accent: 'var(--color-primary)' },
  CONVERTED: { variant: 'secondary', accent: 'var(--color-success)' },
  REJECTED: { variant: 'destructive', accent: 'var(--color-danger)' },
  CANCELLED: { variant: 'secondary', accent: 'var(--color-border-strong)' },
}

export default function ReplenishmentBoard() {
  const { hasPermission } = usePermission()
  const [dryRun] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const { data, isLoading, refetch } = useReplenishmentSuggestions()
  const generate = useGenerateReplenishment()
  const convert = useConvertReplenishment()

  const rows: ReplenishmentSuggestionRow[] = data?.records ?? []

  const canGenerate = hasPermission(PERMISSIONS.REPLENISHMENT.GENERATE)
  const canConvert = hasPermission(PERMISSIONS.REPLENISHMENT.CONVERT)

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="库存运营"
        title="智能补货"
        description="按需求预测与再订货点生成补货建议，人工确认后转采购计划"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              刷新
            </Button>
            <PermissionGate
              allowed={canGenerate}
              reason={`缺少权限 ${PERMISSIONS.REPLENISHMENT.GENERATE}`}
            >
              <Button
                disabled={generate.isPending}
                onClick={() => generate.mutate({ dryRun })}
              >
                {generate.isPending ? '计算中…' : '生成补货建议'}
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <TablePanel>
        <TableToolbar>
          <span className="text-sm text-muted-foreground">
            同一补货周期重复生成会命中幂等键，返回已有单据而不是再建一张。
          </span>
          <TableToolbarEnd />
        </TableToolbar>

        {isLoading ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          <TableEmpty>
            还没有补货建议。点击「生成补货建议」按当前库存与历史需求计算一轮。
          </TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>建议单号</TableHead>
                <TableHead>周期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">明细行</TableHead>
                <TableHead className="text-right">建议量</TableHead>
                <TableHead className="text-right">采纳量</TableHead>
                <TableHead>采购计划</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const config = statusConfig[row.status]
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.suggestionNo}</TableCell>
                    <TableCell>{row.period}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{row.statusLabel}</Badge>
                      {row.convertError ? (
                        <div className="mt-1 text-xs text-[var(--color-danger)]">
                          {row.convertError}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{row.itemCount}</TableCell>
                    <TableCell className="text-right">{row.totalSuggestedQty}</TableCell>
                    <TableCell className="text-right">{row.effectiveQty}</TableCell>
                    <TableCell>
                      {row.purPlanNo ? (
                        <span className="font-mono text-xs">{row.purPlanNo}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailId(row.id)}
                        >
                          详情
                        </Button>
                        <PermissionGate
                          allowed={canConvert}
                          reason={`缺少权限 ${PERMISSIONS.REPLENISHMENT.CONVERT}`}
                        >
                          <Button
                            size="sm"
                            disabled={!row.convertible || convert.isPending}
                            onClick={() => convert.mutate(row.id)}
                          >
                            转采购计划
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TablePanel>

      <ReplenishmentDetailDialog
        suggestionId={detailId}
        open={detailId != null}
        onOpenChange={(next) => !next && setDetailId(null)}
      />
    </div>
  )
}
