'use client'
import { usePathname } from 'next/navigation'

import { WaybillDetail } from '@/features/logistics/components'

export default function WaybillDetailPage() {
  const pathname = usePathname()
  const id = pathname.split('/').pop() ?? ''
  return <WaybillDetail id={id} />
}
