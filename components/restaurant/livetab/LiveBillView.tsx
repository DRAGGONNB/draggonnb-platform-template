'use client'
import { useLiveBill } from '@/hooks/use-live-bill'
import type { RestaurantTable } from '@/lib/restaurant/types'

interface Props {
  sessionId: string
  table: Pick<RestaurantTable, 'id' | 'label' | 'section'>
  restaurant: { id: string; name: string; slug: string; service_charge_pct: number }
  initialSplitMode: string
}

export function LiveBillView({ sessionId, table, restaurant }: Props) {
  const { bill, items, payers, session, loading, error } = useLiveBill(sessionId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center">
          <p className="text-red-400 mb-2">Unable to load your bill</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const isPaymentRequested = session?.status === 'bill_requested' || session?.status === 'partially_paid'
  const isPaid = session?.status === 'closed'

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{restaurant.name}</h1>
          <p className="text-gray-400 text-sm">{table.label}{table.section ? ` · ${table.section}` : ''}</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isPaid ? 'bg-green-900/40 text-green-400' :
            isPaymentRequested ? 'bg-amber-900/40 text-amber-400' :
            'bg-green-900/40 text-green-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-green-400' : isPaymentRequested ? 'bg-amber-400 animate-pulse' : 'bg-green-400 animate-pulse'}`} />
            {isPaid ? 'Paid' : isPaymentRequested ? 'Payment Pending' : 'Live'}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-[#3A3C40] rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="font-medium text-sm text-gray-300 uppercase tracking-wider">Your Order</h2>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            Your items will appear here as they&apos;re added…
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map(item => (
              <div key={item.id} className="flex items-start justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.modifier_notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.modifier_notes}</p>
                  )}
                  {item.quantity > 1 && (
                    <p className="text-xs text-gray-500">×{item.quantity} @ R{Number(item.unit_price).toFixed(2)}</p>
                  )}
                </div>
                <p className="text-sm font-medium ml-4 tabular-nums">R{Number(item.line_total).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      {bill && (
        <div className="bg-[#3A3C40] rounded-2xl px-4 py-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span className="tabular-nums">R{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          {Number(bill.service_charge) > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Service ({bill.service_charge_pct}%)</span>
              <span className="tabular-nums">R{Number(bill.service_charge).toFixed(2)}</span>
            </div>
          )}
          {Number(bill.tip_total) > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Tip</span>
              <span className="tabular-nums">R{Number(bill.tip_total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-white/10">
            <span>Total</span>
            <span className="tabular-nums text-[#6B1420]">R{Number(bill.total).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Split payers */}
      {payers.length > 0 && (
        <div className="bg-[#3A3C40] rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-medium text-sm text-gray-300 uppercase tracking-wider">Split Bill</h2>
          </div>
          {payers.map(payer => (
            <div key={payer.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{payer.display_name}</p>
                {payer.amount_due && (
                  <p className="text-xs text-gray-500">R{Number(payer.amount_due).toFixed(2)}</p>
                )}
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                payer.status === 'paid' ? 'bg-green-900/40 text-green-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {payer.status === 'paid' ? '✓ Paid' : 'Pending'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status messages */}
      {isPaid && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-2xl px-4 py-6 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-bold text-green-400">All Paid — Thank You!</p>
          <p className="text-sm text-gray-400 mt-1">We hope to see you again soon.</p>
        </div>
      )}

      {isPaymentRequested && !isPaid && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl px-4 py-4 text-sm text-center text-amber-300">
          Payment link sent to WhatsApp. Check your messages.
        </div>
      )}

      {/* POPIA footer */}
      <p className="text-xs text-gray-600 text-center mt-6">
        Your data is processed in accordance with POPIA. View our{' '}
        <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </div>
  )
}
