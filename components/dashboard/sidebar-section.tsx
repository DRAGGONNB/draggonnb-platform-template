'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Briefcase,
  TrendingUp,
  Settings,
  Shield,
  Hotel,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SidebarItem } from '@/lib/dashboard/build-sidebar'
import { SidebarFlyout } from './sidebar-flyout'

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Sparkles,
  Users,
  Briefcase,
  TrendingUp,
  Settings,
  Shield,
  Hotel,
  UtensilsCrossed,
}

interface SidebarSectionProps {
  item: SidebarItem
  isActive: boolean
}

/**
 * Single sidebar section item with optional hover/focus flyout.
 * The outer div uses group so the flyout can respond to hover/focus-within.
 */
export function SidebarSection({ item, isActive }: SidebarSectionProps) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
  const hasTabs = item.tabs && item.tabs.length > 0

  return (
    <div className="group relative" aria-haspopup={hasTabs ? 'menu' : undefined}>
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-[#B8941E]/20 text-[#B8941E] border-l-2 border-[#B8941E]'
            : 'text-[#c4b89a] hover:bg-[#2a2520] hover:text-[#FDFCFA]'
        )}
      >
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded',
            isActive && 'text-[#B8941E]'
          )}
        >
          <Icon size={16} />
        </span>
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              item.badge.tone === 'admin'
                ? 'bg-[#B8941E]/20 text-[#B8941E]'
                : 'bg-[#3a3328] text-[#c4b89a]'
            )}
          >
            {item.badge.text}
          </span>
        )}
        {hasTabs && (
          <svg
            className="h-3 w-3 shrink-0 text-[#6b6457]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </Link>

      {hasTabs && <SidebarFlyout tabs={item.tabs!} parentLabel={item.label} />}
    </div>
  )
}
