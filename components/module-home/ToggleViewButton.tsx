'use client'

import { cn } from '@/lib/utils/cn'

interface Props {
  currentMode: 'easy' | 'advanced'
  advancedHref: string
  easyHref: string
  apiEndpoint: string
}

export function ToggleViewButton({ currentMode, advancedHref, easyHref, apiEndpoint }: Props) {
  const targetMode = currentMode === 'easy' ? 'advanced' : 'easy'
  const targetHref = currentMode === 'easy' ? advancedHref : easyHref
  const label = currentMode === 'easy' ? 'Advanced view →' : 'Easy view →'

  // Defensive guard -- should never render when destination equals current mode
  if (targetMode === currentMode) return null

  const handleClick = async () => {
    // Persist preference fire-and-forget; navigate immediately for snappy feel
    fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: targetMode }),
    }).catch(() => {
      /* persistence failure is not user-blocking */
    })
    window.location.href = targetHref
  }

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className={cn(
        'fixed z-40 right-4 bottom-20 sm:bottom-4',
        'h-10 min-w-[56px] px-3 rounded-full',
        'bg-white border border-gray-200 shadow-md',
        'text-sm font-medium text-gray-700',
        'hover:bg-gray-50 hover:shadow-lg transition-all',
        'flex items-center gap-1.5'
      )}
    >
      {label}
    </button>
  )
}
