'use client'

type BillSummaryItem = {
  id: string
  name: string
  quantity: number
  line_total: number
  unit_price: number
  is_voided?: boolean
}

type BillSummaryBill = {
  subtotal: number
  service_charge: number
  tip_amount?: number
  total: number
  status: string
}

type BillSummaryCardProps = {
  bill: BillSummaryBill | null
  items: BillSummaryItem[]
  onVoidItem: (item: BillSummaryItem) => void
}

function BillStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    open: { label: 'OPEN', classes: 'bg-[#6B1420]/20 text-[#E05A6E]' },
    pending_payment: { label: 'BILL REQUESTED', classes: 'bg-amber-500/20 text-amber-400' },
    partially_paid: { label: 'PARTIALLY PAID', classes: 'bg-blue-500/20 text-blue-400' },
    paid: { label: 'PAID', classes: 'bg-green-500/20 text-green-400' },
    voided: { label: 'VOIDED', classes: 'bg-white/10 text-gray-500' },
  }
  const entry = map[status] ?? { label: status.toUpperCase(), classes: 'bg-white/10 text-gray-400' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${entry.classes}`}>
      {entry.label}
    </span>
  )
}

export function BillSummaryCard({ bill, items, onVoidItem }: BillSummaryCardProps) {
  const activeItems = items.filter(i => !i.is_voided)
  const voidedItems = items.filter(i => i.is_voided)

  if (!bill) {
    return (
      <div className="bg-[#1E2023] rounded-2xl p-5">
        <p className="text-sm text-gray-500 text-center py-4">No bill data</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1E2023] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h2 className="font-semibold text-white text-sm">Items</h2>
        <BillStatusBadge status={bill.status} />
      </div>

      {/* Item list */}
      <div className="divide-y divide-white/5">
        {activeItems.length === 0 && voidedItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No items on bill</p>
        ) : null}

        {activeItems.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3 group">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white">
                {item.quantity > 1 ? `${item.quantity}\u00d7 ` : ''}{item.name}
              </span>
            </div>
            <span className="text-sm text-gray-300 tabular-nums shrink-0">
              R{Number(item.line_total).toFixed(2)}
            </span>
            <button
              onClick={() => onVoidItem(item)}
              aria-label={`Void ${item.name}`}
              className="w-7 h-7 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-red-400 active:scale-95 transition-all -mr-2"
              title="Void item"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}

        {voidedItems.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3 opacity-50">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-500 line-through">
                {item.quantity > 1 ? `${item.quantity}\u00d7 ` : ''}{item.name}
              </span>
            </div>
            <span className="text-sm text-gray-500 tabular-nums line-through shrink-0">
              R{Number(item.line_total).toFixed(2)}
            </span>
            <div className="w-7 h-7 -mr-2" />
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-5 py-4 border-t border-white/5 space-y-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Subtotal</span>
          <span className="tabular-nums">R{Number(bill.subtotal).toFixed(2)}</span>
        </div>
        {Number(bill.service_charge) > 0 && (
          <div className="flex justify-between text-sm text-gray-400">
            <span>Service charge</span>
            <span className="tabular-nums">R{Number(bill.service_charge).toFixed(2)}</span>
          </div>
        )}
        {bill.tip_amount !== undefined && Number(bill.tip_amount) > 0 && (
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tip</span>
            <span className="tabular-nums">R{Number(bill.tip_amount).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t border-white/5 mt-1">
          <span className="text-white">Total</span>
          <span className="text-[#6B1420] tabular-nums">R{Number(bill.total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
