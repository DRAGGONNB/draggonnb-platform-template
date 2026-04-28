'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SafetyFlag {
  type: string
  reason: string
  excerpt?: string
}

interface BrandSafetyBadgeProps {
  brandSafe: boolean | null
  flags?: SafetyFlag[] | string[]
}

export function BrandSafetyBadge({ brandSafe, flags = [] }: BrandSafetyBadgeProps) {
  const [showFlags, setShowFlags] = useState(false)

  if (brandSafe === null) {
    return (
      <Badge variant="secondary" className="text-xs">
        Not yet checked
      </Badge>
    )
  }

  if (brandSafe === true) {
    return (
      <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
        Brand safe
      </Badge>
    )
  }

  // brandSafe === false
  const normalizedFlags: SafetyFlag[] = flags.map((f) =>
    typeof f === 'string' ? { type: f, reason: f } : f
  )

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowFlags(!showFlags)}
        className="inline-flex"
      >
        <Badge
          variant="outline"
          className="text-xs border-amber-500 text-amber-600 cursor-pointer hover:bg-amber-50"
        >
          Review flags ({normalizedFlags.length})
        </Badge>
      </button>

      {showFlags && normalizedFlags.length > 0 && (
        <div className="absolute top-6 left-0 z-50 w-72 bg-white border rounded-lg shadow-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700">Brand safety flags</p>
            <button
              type="button"
              onClick={() => setShowFlags(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {normalizedFlags.map((flag, i) => (
            <div key={i} className="text-xs border-l-2 border-amber-400 pl-2 space-y-0.5">
              <p className="font-medium capitalize text-amber-800">{flag.type.replace(/_/g, ' ')}</p>
              <p className="text-muted-foreground">{flag.reason}</p>
              {flag.excerpt && (
                <p className="italic text-gray-500 text-[11px]">"{flag.excerpt}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
