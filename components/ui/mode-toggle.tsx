'use client'

import { cn } from '@/lib/utils/cn'

export interface ModeToggleProps {
  value: 'autopilot' | 'hands-on'
  onChange: (value: 'autopilot' | 'hands-on') => void
  labels?: { autopilot: string; handsOn: string }
  ariaLabel?: string
  className?: string
}

/**
 * Reusable Autopilot / Hands-on mode toggle primitive.
 * Controlled component — parent owns state and persistence.
 *
 * Phase 11 Easy/Advanced toggle uses this with label overrides:
 *   <ModeToggle value={mode} onChange={setMode}
 *     labels={{ autopilot: 'Easy', handsOn: 'Advanced' }} />
 */
export function ModeToggle({
  value,
  onChange,
  labels,
  ariaLabel = 'View mode',
  className,
}: ModeToggleProps) {
  const autopilotLabel = labels?.autopilot ?? 'Autopilot'
  const handsOnLabel = labels?.handsOn ?? 'Hands-on'

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex rounded-lg border border-gray-200 bg-white p-1',
        className
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'autopilot'}
        onClick={() => onChange('autopilot')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          value === 'autopilot'
            ? 'bg-brand-crimson-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        {autopilotLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'hands-on'}
        onClick={() => onChange('hands-on')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          value === 'hands-on'
            ? 'bg-brand-crimson-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        {handsOnLabel}
      </button>
    </div>
  )
}
