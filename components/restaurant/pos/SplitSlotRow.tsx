'use client'

type SplitSlot = {
  slot_number: number
  display_name?: string
  share_amount: number
  status: string
  payfast_token: string
}

type SplitSlotRowProps = {
  slot: SplitSlot
  onSendLink: (payerToken: string) => void
  onMarkCash: (payerToken: string) => void
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Paid
      </span>
    )
  }
  if (status === 'awaiting_payment') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
        Awaiting
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-gray-400 text-xs font-medium">
      Pending
    </span>
  )
}

export function SplitSlotRow({ slot, onSendLink, onMarkCash }: SplitSlotRowProps) {
  const displayName = slot.display_name || `Guest ${slot.slot_number}`
  const isPaid = slot.status === 'paid'
  const isActionable = !isPaid

  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-[#3A3C40] rounded-xl">
      {/* Slot number badge */}
      <div className="w-7 h-7 rounded-full bg-[#2D2F33] flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-gray-300">{slot.slot_number}</span>
      </div>

      {/* Name */}
      <span className="flex-1 text-sm text-white truncate">{displayName}</span>

      {/* Amount */}
      <span className="text-sm font-medium text-white tabular-nums shrink-0">
        R{Number(slot.share_amount).toFixed(2)}
      </span>

      {/* Status badge */}
      <StatusBadge status={slot.status} />

      {/* Action buttons */}
      {isActionable && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onMarkCash(slot.payfast_token)}
            className="min-h-[44px] px-3 rounded-lg bg-[#2D2F33] text-gray-300 text-xs font-medium active:scale-95 transition-transform hover:bg-[#252729]"
          >
            Cash
          </button>
          <button
            onClick={() => onSendLink(slot.payfast_token)}
            className="min-h-[44px] px-3 rounded-lg bg-[#6B1420] text-white text-xs font-medium active:scale-95 transition-transform hover:bg-[#8B1A2A]"
          >
            Send Link
          </button>
        </div>
      )}

      {/* Paid confirmation icon */}
      {isPaid && (
        <div className="shrink-0 text-green-400" aria-label="Paid">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8.5" stroke="currentColor" strokeOpacity="0.4" />
            <path d="M5 9L7.5 11.5L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}
