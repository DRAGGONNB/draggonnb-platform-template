'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SidebarSection } from './sidebar-section'
import type { SidebarItem } from '@/lib/dashboard/build-sidebar'

interface SidebarClientProps {
  items: SidebarItem[]
  orgName?: string
}

/**
 * Client component: renders the static sidebar shell, manages active-state
 * via pathname, and hosts the flyout state via CSS group pattern.
 *
 * Palette: #1E1B16 charcoal bg, #B8941E gold accent, #FDFCFA warm white text
 */
export function SidebarClient({ items, orgName }: SidebarClientProps) {
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
