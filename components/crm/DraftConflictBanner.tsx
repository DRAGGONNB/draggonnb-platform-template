'use client'
// Plan 11-09: Soft conflict warning — shown when another tab wrote the draft within 60s.
// No hard-block (CONTEXT.md locked): user can Reload or Dismiss.
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DraftConflictBannerProps {
  onReload: () => void
  onDismiss: () => void
}

export function DraftConflictBanner({ onReload, onDismiss }: DraftConflictBannerProps) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-800">
            This draft was edited from another tab
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Your view may be out of sync. Reload to see the latest changes.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={onReload}
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            Reload
          </Button>
          <Button
            onClick={onDismiss}
            size="sm"
            variant="ghost"
            className="text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}
