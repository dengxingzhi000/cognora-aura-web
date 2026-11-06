'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTrackingEvents } from '../hooks'
import type { TrackingEvent } from '../types'

interface Props {
  waybillId: string
  /** Optional preloaded events; when omitted the component fetches them itself. */
  events?: TrackingEvent[]
  signTime?: string
}

export default function TrackingTimeline({ waybillId, events, signTime }: Props) {
  const query = useTrackingEvents(events ? '' : waybillId)
  const items = events ?? query.data ?? []

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>物流轨迹</CardTitle>
        <div className="text-muted-foreground text-[11px]">
          共 {items.length} 条轨迹
          {signTime ? ` · 签收时间 ${signTime}` : ''}
        </div>
      </CardHeader>
      <CardContent className="px-4">
        {query.isLoading && !events ? (
          <div className="text-muted-foreground py-8 text-center text-[12px]">
            轨迹加载中…
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-[12px]">
            暂无物流轨迹
          </div>
        ) : (
          <ol className="relative space-y-0">
            {items.map((event, index) => {
              const latest = index === 0
              return (
                <li
                  key={event.id}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  <div className="relative flex w-3 shrink-0 justify-center">
                    <span
                      className="mt-1 size-2.5 rounded-full"
                      style={{
                        backgroundColor: latest
                          ? 'var(--color-success)'
                          : 'var(--color-border-strong)',
                      }}
                    />
                    {index < items.length - 1 && (
                      <span className="bg-border absolute top-3 bottom-0 w-px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={
                          latest
                            ? 'text-[12px] font-semibold text-foreground'
                            : 'text-[12px] text-foreground'
                        }
                      >
                        {event.description}
                      </span>
                      <span className="text-muted-foreground rounded border border-[var(--color-border-secondary)] px-1.5 py-0.5 text-[10px]">
                        {event.statusLabel}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-[11px]">
                      {event.time} · {event.location}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[10px]">
                      来源：{event.source || '未标注'}
                      {event.operator ? ` · 操作人：${event.operator}` : ''}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
