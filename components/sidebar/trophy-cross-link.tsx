'use client'

// components/sidebar/trophy-cross-link.tsx
// NAV-01 + NAV-03: Trophy OS sidebar item with loading state.
// Reads linkedTrophyOrgId (injected from x-linked-trophy-org-id header by server parent).
// Active state: clicking navigates to /api/sso/issue?target=trophy (bridge issues JWT, 302 to Trophy).
// Inactive state: renders "Activate Trophy OS" link to the explicit activation page (NAV-04).

import { useState } from 'react'
import Link from 'next/link'

interface TrophyCrossLinkProps {
  /**
   * The Trophy org ID linked to this DraggonnB org.
   * When null/empty: render the "Activate Trophy OS" empty-state link.
   * When non-null: render the bridge link with loading state.
   * Sourced from x-linked-trophy-org-id request header (injected by middleware).
   */
  linkedTrophyOrgId: string | null
}

export function TrophyCrossLink({ linkedTrophyOrgId }: TrophyCrossLinkProps) {
  const [loading, setLoading] = useState(false)

  if (!linkedTrophyOrgId) {
    return (
      <Link
        href="/dashboard/activate-trophy"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#6b6457] hover:bg-[#2a2720] hover:text-[#FDFCFA] transition-colors"
        aria-label="Activate Trophy OS"
      >
        <PlusIcon />
        <span>Activate Trophy OS</span>
      </Link>
    )
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setLoading(true)
    // Navigate to the SSO issue endpoint.
    // The server-side route signs a bridge JWT and 302-redirects to
    // Trophy's /sso/consume#token=... URL. The browser follows the redirect.
    window.location.href = '/api/sso/issue?target=trophy'

    // Fallback: if navigation stalls (unlikely), reset loading state after 5s
    // so the user can retry. Visibility check prevents resetting during the redirect.
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setLoading(false)
      }
    }, 5000)
  }

  return (
    <a
      href="/api/sso/issue?target=trophy"
      onClick={handleClick}
      aria-busy={loading}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#B8941E] hover:bg-[#2a2720] hover:text-[#FDFCFA] transition-colors cursor-pointer"
      aria-label="Open Trophy OS"
    >
      <TrophyIcon />
      <span>{loading ? 'Connecting to Trophy OS…' : 'Trophy OS'}</span>
      {loading && <LoadingSpinner />}
    </a>
  )
}

function TrophyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <span
      className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent ml-auto flex-shrink-0"
      aria-hidden="true"
    />
  )
}
