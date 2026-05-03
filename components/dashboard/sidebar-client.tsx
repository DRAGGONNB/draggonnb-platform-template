'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SidebarSection } from './sidebar-section'
import { TrophyCrossLink } from '@/components/sidebar/trophy-cross-link'
import type { SidebarItem } from '@/lib/dashboard/build-sidebar'

interface SidebarClientProps {
  items: SidebarItem[]
  orgName?: string
  /**
   * Linked Trophy org ID from x-linked-trophy-org-id header (injected by middleware).
   * null = no Trophy link; non-null = Trophy OS is activated for this org.
   * NAV-01 / LATENT-02.
   */
  linkedTrophyOrgId?: string | null
}

/**
 * Client component: renders the static sidebar shell, manages active-state
 * via pathname, and hosts the flyout state via CSS group pattern.
 *
 * Palette: #1E1B16 charcoal bg, #B8941E gold accent, #FDFCFA warm white text
 */
export function SidebarClient({ items, orgName, linkedTrophyOrgId = null }: SidebarClientProps) {
  const pathname = usePathname()

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#3a3328] bg-[#1E1B16]"
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col overflow-y-auto py-6">
        {/* Logo */}
        <div className="mb-8 px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="DraggonnB"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-base font-bold text-[#FDFCFA]">
              DRAGONN<span className="text-[#B8941E]">NB</span>{' '}
              <span className="text-xs font-medium text-[#6b6457]">OS</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            // Dashboard exact match; all other items use startsWith
            const isActive =
              item.id === 'dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(item.href + '/')

            return <SidebarSection key={item.id} item={item} isActive={isActive} />
          })}
        </nav>

        {/* Cross-Product: Trophy OS link (NAV-01). Always rendered — active or activate CTA. */}
        <div className="mt-4 border-t border-[#3a3328] pt-3 px-1">
          <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-[#4a4438]">Cross-Product</p>
          <TrophyCrossLink linkedTrophyOrgId={linkedTrophyOrgId} />
        </div>

        {/* Org name footer */}
        {orgName && (
          <div className="mt-auto border-t border-[#3a3328] px-6 py-4">
            <p className="truncate text-xs text-[#6b6457]">{orgName}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
