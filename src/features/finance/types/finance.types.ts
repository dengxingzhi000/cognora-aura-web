export interface Settlement {
  id: string
  settlementNo: string
  supplierName: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  statusLabel: string
  period: string
  createdAt: string
  partnerType: string
  startDate: string
  endDate: string
  totalAmount: number
  discountAmount: number
  adjustmentAmount: number
  paidAmount: number
  unpaidAmount: number
  approverName: string
  approvedAt: string
  remark: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  settlementNo: string
  partyName: string
  amount: number
  taxAmount: number
  status: 'pending' | 'issued' | 'sent' | 'received' | 'voided' | 'red_flushed'
  statusLabel: string
  createdAt: string
}
