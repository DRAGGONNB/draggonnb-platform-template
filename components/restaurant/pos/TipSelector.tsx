'use client'
import { useState } from 'react'

type TipSelectorProps = {
  subtotal: number
  onTipChange: (tipAmount: number) => void
  selectedPct: number | null
  onPctChange: (pct: number | null) => void
}

const PCT_OPTIONS = [10, 12.5, 15] as const

export function TipSelector({ subtotal, onTipChange, selectedPct, onPctChange }: TipSelectorProps) {
  const [mode, setMode] = useState<'pct' | 'custom' | 'skip'>('pct')
  const [customAmount, setCustomAmount] = useState('')

  function selectPct(pct: number) {
    setMode('pct')
    onPctChange(pct)
    onTipChange(Number((subtotal * pct / 100).toFixed(2)))
  }

  function selectCustom() {
    setMode('custom')
    onPctChange(null)
    const amount = parseFloat(customAmount) || 0
    onTipChange(amount)
  }

  function selectSkip() {
    setMode('skip')
    onPctChange(null)
    onTipChange(0)
  }

  function handleCustomInput(value: string) {
    setCustomAmount(value)
    const amount = parseFloat(value) || 0
    onTipChange(amount)
  }

  const calculatedTip =
    mode === 'skip'
      ? 0
      : mode === 'custom'
        ? parseFloat(customAmount) || 0
        : selectedPct !== null
          ? Number((subtotal * selectedPct / 100).toFixed(2))
          : 0

  return (
    <div>
      {/* Button row */}
      <div className="flex gap-2 flex-wrap">
        {PCT_OPTIONS.map(pct => {
          const isSelected = mode === 'pct' && selectedPct === pct
          return (
            <button
              key={pct}
              onClick={() => selectPct(pct)}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors active:scale-95 ${
                isSelected
                  ? 'bg-[#6B1420] text-white'
                  : 'bg-[#3A3C40] text-gray-300 hover:bg-[#454749]'
              }`}
            >
              {pct}%
            </button>
          )
        })}
        <button
          onClick={selectCustom}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors active:scale-95 ${
            mode === 'custom'
              ? 'bg-[#6B1420] text-white'
              : 'bg-[#3A3C40] text-gray-300 hover:bg-[#454749]'
          }`}
        >
          Custom
        </button>
        <button
          onClick={selectSkip}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors active:scale-95 ${
            mode === 'skip'
              ? 'bg-[#3A3C40] text-white ring-1 ring-white/20'
              : 'bg-[#3A3C40] text-gray-300 hover:bg-[#454749]'
          }`}
        >
          Skip
        </button>
      </div>

      {/* Custom amount input */}
      {mode === 'custom' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-400">R</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={customAmount}
            onChange={e => handleCustomInput(e.target.value)}
            placeholder="0.00"
            className="w-32 bg-[#3A3C40] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-[#6B1420] min-h-[44px]"
            autoFocus
          />
        </div>
      )}

      {/* Calculated tip display */}
      <p className="mt-2 text-sm text-gray-400">
        Tip:{' '}
        <span className="text-white font-medium">
          R{calculatedTip.toFixed(2)}
        </span>
      </p>
    </div>
  )
}
