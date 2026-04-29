'use client'

import Link from 'next/link'
import type { SidebarTab } from '@/lib/dashboard/build-sidebar'

interface SidebarFlyoutProps {
  tabs: SidebarTab[]
  parentLabel: string
}

/**
 * Hover/focus flyout panel for a sidebar section.
 * Positioned absolute left-full top-0 — appears to the right of the sidebar icon.
 * Keyboard accessible: role="menu", items role="menuitem".
 */
export function SidebarFlyout({ tabs, parentLabel }: SidebarFlyoutProps) {
  return (
    <div
      role="menu"
      aria-label={`${parentLabel} sub-pages`}
      className="
        absolute left-full top-0 z-50 ml-1
        min-w-[192px] rounded-lg border border-[#3a3328]
        bg-[#2a2520] py-1 shadow-lg
        opacity-0 pointer-events-none
        group-hover:opacity-100 group-hover:pointer-events-auto
        group-focus-within:opacity-100 group-focus-within:pointer-events-auto
        transition-opacity duration-150
      "
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="menuitem"
          className="
            block px-4 py-2 text-sm text-[#c4b89a]
            hover:bg-[#3a3328] hover:text-[#FDFCFA]
            focus:bg-[#3a3328] focus:text-[#FDFCFA] focus:outline-none
            transition-colors
          "
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
