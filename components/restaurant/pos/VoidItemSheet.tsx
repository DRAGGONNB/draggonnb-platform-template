'use client'
import { useState } from 'react'
import { PINPad } from '@/components/restaurant/auth/PINPad'

type VoidItemSheetItem = {
  id: string
  name: string
  quantity: number
  line_total: number
  unit_price: number
}

type VoidItemSheetProps = {
  item: VoidItemSheetItem | null
  onClose: () => void
  onVoid: (itemId: string, reason: string, pin?: string) => Promise<void>
}

export function VoidItemSheet({ item, onClose, onVoid }: VoidItemSheetProps) {
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiresPin = item !== null && item.unit_price > 50
  const canSubmit = reason.trim().length > 0 && (!requiresPin || pin.length === 4)

  function handlePinComplete(entered: string) {
    setPin(entered)
    setPinError(false)
  }

  function handlePinClear() {
    setPin('')
    setPinError(false)
  }

  async function handleVoid() {
    if (!item || !canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await onVoid(item.id, reason.trim(), requiresPin ? pin : undefined)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to void item'
      if (msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('manager')) {
        setPinError(true)
        setPin('')
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Void item: ${item.name}`}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E2023] rounded-t-2xl shadow-2xl border-t border-white/10 transition-transform"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-6 pt-2">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">
              Void: {item.name} &times; {item.quantity}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              R{Number(item.line_total).toFixed(2)}
            </p>
          </div>

          {/* Reason input */}
          <div className="mb-5">
            <label htmlFor="void-reason" className="block text-sm font-medium text-gray-300 mb-1.5">
              Void reason
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="void-reason"
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer changed order"
              disabled={loading}
              className="w-full bg-[#3A3C40] rounded-xl px-3 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-[#6B1420] disabled:opacity-50 min-h-[44px]"
            />
          </div>

          {/* PIN pad — only shown for high-value items */}
          {requiresPin && (
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-300 mb-4 text-center">
                Manager PIN required
              </p>
              <div className="flex justify-center">
                <PINPad
                  onComplete={handlePinComplete}
                  onClear={handlePinClear}
                  error={pinError}
                />
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-[#3A3C40] text-gray-300 rounded-xl py-3 text-sm font-medium min-h-[44px] active:scale-95 transition-transform disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVoid}
              disabled={!canSubmit || loading}
              className="flex-1 bg-[#6B1420] text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Voiding...
                </>
              ) : (
                'Void Item'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
