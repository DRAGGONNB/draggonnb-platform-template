'use client'

import { useState } from 'react'

interface ArchiveButtonProps {
  orgId: string
  orgName: string
  isPlatformAdmin: boolean
  onArchived?: () => void
}

/**
 * Admin UI: soft-archive an organization.
 * Disabled for the platform_admin org ("DragoonB Business Automation") —
 * the API route will also reject the call as defence-in-depth.
 */
export function ArchiveButton({
  orgId,
  orgName,
  isPlatformAdmin,
  onArchived,
}: ArchiveButtonProps) {
  const [pending, setPending] = useState(false)

  if (isPlatformAdmin) {
    return (
      <span className="text-xs text-gray-500" data-testid="archive-button-protected">
        platform admin (cannot archive)
      </span>
    )
  }

  async function archive() {
    if (
      !confirm(
        `Archive ${orgName}?\n\nThis hides it from tenant resolution but does NOT delete data.`,
      )
    ) {
      return
    }
    setPending(true)
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/archive`, {
        method: 'POST',
      })
      if (res.ok) {
        if (onArchived) onArchived()
        else location.reload()
      } else {
        const body = await res.json().catch(() => ({}))
        alert(`Archive failed: ${body.error ?? res.statusText}`)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={archive}
      disabled={pending}
      className="text-sm text-[#6B1420] underline disabled:text-gray-400 disabled:no-underline"
      data-testid="archive-button"
    >
      {pending ? 'Archiving...' : 'Archive'}
    </button>
  )
}
