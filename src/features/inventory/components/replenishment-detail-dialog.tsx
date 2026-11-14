'use client'

import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from '@/components/ui/permission-gate'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermission } from '@/hooks/use-permission'
import {
  useAdjustReplenishmentItem,
  useAdoptReplenishment,
  useConvertReplenishment,
  useDemandForecast,
  useRejectReplenishment,
  useReplenishmentDetail,
} from '../hooks'
import type { ReplenishmentItemRow } from '../types'

/**
 * 补货建议单详情与人审改量。
 *
 * 为什么改量放在弹窗而不是列表页：改量必须看到 ROP / 在途量 / 目标水位和决策快照，
 * 否则用户只是把一个数字换成另一个数字，并不知道缺口的来历。这里把「算量那一刻」
 * 的输入全部摊开，改量才有依据。
 *
 * 只读性：`editable` 由 mapper 依据状态机派生，ADOPTED 之后一律不可改——
 * 采纳过的量就是将要转出的量，事后修改会让下游采购计划与建议不一致。
 */
export default function ReplenishmentDetailDialog({
  suggestionId,
  open,
  onOpenChange,
}: {
  suggestionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { hasPermission } = usePermission()
  const { data: suggestion, isLoading } = useReplenishmentDetail(
    open ? suggestionId ?? undefined : undefined
  )
  const adjust = useAdjustReplenishmentItem()
  const adopt = useAdoptReplenishment()
  const reject = useRejectReplenishment()
  const convert = useConvertReplenishment()

  // 每行的改量草稿：未编辑时为空串，提交时才转 number。
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [rejectReason, setRejectReason] = useState('')

  // 换一张单据就丢弃上一张的草稿，避免把 A 单的数量填到 B 单。
  useEffect(() => {
    setDrafts({})
    setRejectReason('')
  }, [suggestionId])

  const items: ReplenishmentItemRow[] = suggestion?.items ?? []
  const editable = Boolean(suggestion?.editable)

  const canEditItem = hasPermission(PERMISSIONS.REPLENISHMENT.EDIT_ITEM)
  const canAdopt = hasPermission(PERMISSIONS.REPLENISHMENT.ADOPT)
  const canReject = hasPermission(PERMISSIONS.REPLENISHMENT.REJECT)
  const canConvert = hasPermission(PERMISSIONS.REPLENISHMENT.CONVERT)

  const submitAdjust = (item: ReplenishmentItemRow) => {
    const raw = drafts[item.id]
    if (raw === undefined || raw.trim() === '' || !suggestionId) {
      return
    }
    const qty = Number(raw)
    if (!Number.isFinite(qty) || qty < 0) {
      return
    }
    adjust.mutate({ suggestionId, itemId: item.id, adoptedQty: qty })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            补货建议 {suggestion?.suggestionNo ?? ''}
            {suggestion ? (
              <Badge variant="secondary" className="ml-2">
                {suggestion.statusLabel}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            每一行冻结了「算量那一刻」的可用量、在途量与目标水位——台账之后怎么变都不回写，
            人审看到的就是系统当时据以决策的数字。
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">加载中…</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            本单没有明细行（该周期没有触发补货的 SKU）。
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU / 仓库</TableHead>
                  <TableHead className="text-right">可用</TableHead>
                  <TableHead className="text-right">在途</TableHead>
                  <TableHead className="text-right">ROP</TableHead>
                  <TableHead className="text-right">安全库存</TableHead>
                  <TableHead className="text-right">目标水位</TableHead>
                  <TableHead className="text-right">建议量</TableHead>
                  <TableHead className="text-right">采纳量</TableHead>
                  <TableHead>提示</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      <div>{item.skuId}</div>
                      <div className="text-muted-foreground">{item.warehouseId}</div>
                      {item.reason ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-muted-foreground">
                            决策快照
                          </summary>
                          <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                            {item.reason}
                          </p>
                        </details>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{item.availableStock}</TableCell>
                    <TableCell className="text-right">{item.inTransitQty}</TableCell>
                    <TableCell className="text-right">{item.reorderPoint}</TableCell>
                    <TableCell className="text-right">{item.safetyStock}</TableCell>
                    <TableCell className="text-right">{item.targetStock}</TableCell>
                    <TableCell className="text-right">{item.suggestedQty}</TableCell>
                    <TableCell className="text-right">
                      {editable && canEditItem ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            className="h-7 w-20 text-right"
                            inputMode="numeric"
                            placeholder={String(item.effectiveQty)}
                            value={drafts[item.id] ?? ''}
                            onChange={(event) =>
                              setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={adjust.isPending}
                            onClick={() => submitAdjust(item)}
                          >
                            改
                          </Button>
                        </div>
                      ) : (
                        <span className={item.adjusted ? 'font-semibold' : undefined}>
                          {item.effectiveQty}
                          {item.adjusted ? ' *' : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.flags.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          item.flags.map((flag) => (
                            <Badge key={flag.key} variant={flag.tone}>
                              {flag.label}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {editable ? (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="reject-reason">
              驳回原因（驳回必填）
            </label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="例如：本周期改用调拨补货"
            />
          </div>
        ) : null}

        {suggestion?.convertError ? (
          <p className="text-xs text-[var(--color-danger)]">
            上次转换失败：{suggestion.convertError}（单据已保留，可重试）
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <PermissionGate
            allowed={canReject}
            reason={`缺少权限 ${PERMISSIONS.REPLENISHMENT.REJECT}`}
          >
            <Button
              variant="outline"
              disabled={!editable || reject.isPending || !rejectReason.trim()}
              onClick={() =>
                suggestionId &&
                reject.mutate({ id: suggestionId, reason: rejectReason.trim() })
              }
            >
              驳回
            </Button>
          </PermissionGate>
          <PermissionGate
            allowed={canAdopt}
            reason={`缺少权限 ${PERMISSIONS.REPLENISHMENT.ADOPT}`}
          >
            <Button
              disabled={!suggestion?.decidable || adopt.isPending}
              onClick={() => suggestionId && adopt.mutate(suggestionId)}
            >
              采纳
            </Button>
          </PermissionGate>
          <PermissionGate
            allowed={canConvert}
            reason={`缺少权限 ${PERMISSIONS.REPLENISHMENT.CONVERT}`}
          >
            <Button
              disabled={!suggestion?.convertible || convert.isPending}
              onClick={() => suggestionId && convert.mutate(suggestionId)}
            >
              转采购计划
            </Button>
          </PermissionGate>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
