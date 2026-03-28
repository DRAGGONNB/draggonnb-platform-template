'use client'
import { useState, useEffect, useCallback } from 'react'

interface PINPadProps {
  onComplete: (pin: string) => void
  onClear: () => void
  error?: boolean
}

const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }
  30% { transform: translateX(6px); }
  45% { transform: translateX(-4px); }
  60% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
  90% { transform: translateX(2px); }
}
`

export function PINPad({ onComplete, onClear, error = false }: PINPadProps) {
  const [digits, setDigits] = useState<string[]>([])
  const [shaking, setShaking] = useState(false)

  // Shake on error
  useEffect(() => {
    if (error) {
      setShaking(true)
      setDigits([])
      const t = setTimeout(() => setShaking(false), 600)
      return () => clearTimeout(t)
    }
  }, [error])

  const handleDigit = useCallback((d: string) => {
    setDigits(prev => {
      if (prev.length >= 4) return prev
      const next = [...prev, d]
      if (next.length === 4) {
        // Schedule onComplete after state is set
        setTimeout(() => onComplete(next.join('')), 0)
      }
      return next
    })
  }, [onComplete])

  const handleBackspace = useCallback(() => {
    setDigits(prev => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    setDigits([])
    onClear()
  }, [onClear])

  const pad = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'back', '0', 'confirm',
  ]

  return (
    <>
      <style>{shakeKeyframes}</style>
      <div
        style={shaking ? { animation: 'shake 0.5s ease-in-out' } : undefined}
        className="flex flex-col items-center gap-6"
      >
        {/* 4 dot indicators */}
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                i < digits.length
                  ? 'bg-[#6B1420] border-[#6B1420]'
                  : error
                  ? 'border-red-500'
                  : 'border-white/30'
              }`}
            />
          ))}
        </div>

        {/* Numpad grid */}
        <div className="grid grid-cols-3 gap-3">
          {pad.map((key) => {
            if (key === 'back') {
              return (
                <button
                  key="back"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  className="w-16 h-16 rounded-2xl bg-[#3A3C40] text-white text-xl flex items-center justify-center active:scale-95 transition-transform hover:bg-[#454749]"
                >
                  {/* Backspace icon */}
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <path
                      d="M8 1L1 9L8 17H21V1H8Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13 6L17 12M17 6L13 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )
            }

            if (key === 'confirm') {
              const disabled = digits.length < 4
              return (
                <button
                  key="confirm"
                  onClick={() => !disabled && onComplete(digits.join(''))}
                  disabled={disabled}
                  aria-label="Confirm PIN"
                  className={`w-16 h-16 rounded-2xl text-white text-xl flex items-center justify-center transition-all active:scale-95 ${
                    disabled
                      ? 'bg-[#2D2F33] text-white/20 cursor-not-allowed'
                      : 'bg-[#6B1420] hover:bg-[#8B1A2A]'
                  }`}
                >
                  {/* Checkmark */}
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <path
                      d="M2 9L8 15L20 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )
            }

            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                className="w-16 h-16 rounded-2xl bg-[#3A3C40] text-white text-xl font-semibold flex items-center justify-center active:scale-95 transition-transform hover:bg-[#454749]"
              >
                {key}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
