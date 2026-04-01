'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard, AlertTriangle, ClipboardCheck, Flame, Map,
  Droplets, Wheat, Users, Wrench, Shield, UserCheck, FileText, Settings
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, AlertTriangle, ClipboardCheck, Flame, Map,
  Droplets, Wheat, Users, Wrench, Shield, UserCheck, FileText, Settings,
}

const nav = [
  { name: 'Dashboard', href: '/elijah', icon: 'LayoutDashboard' },
  { name: 'Incidents', href: '/elijah/incidents', icon: 'AlertTriangle' },
  { name: 'Roll Call', href: '/elijah/rollcall', icon: 'ClipboardCheck' },
  { separator: true, label: 'Fire Operations' },
  { name: 'Fire Ops', href: '/elijah/fire', icon: 'Flame' },
  { name: 'Fire Map', href: '/elijah/fire/map', icon: 'Map' },
  { name: 'Water Points', href: '/elijah/fire/water-points', icon: 'Droplets' },
  { name: 'Farms', href: '/elijah/fire/farms', icon: 'Wheat' },
  { name: 'Responder Groups', href: '/elijah/fire/groups', icon: 'Users' },
  { name: 'Equipment', href: '/elijah/fire/equipment', icon: 'Wrench' },
  { separator: true, label: 'Operations' },
  { name: 'Patrols', href: '/elijah/patrols', icon: 'Shield' },
  { name: 'Members', href: '/elijah/members', icon: 'UserCheck' },
  { name: 'SOPs', href: '/elijah/sops', icon: 'FileText' },
  { name: 'Settings', href: '/elijah/settings', icon: 'Settings' },
] as const

export default function ElijahLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-6">
      {/* Elijah Sub-Navigation */}
      <nav className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-1">
          <div className="mb-4 flex items-center gap-2 px-3">
            <Shield className="h-5 w-5 text-red-600" />
            <span className="text-sm font-bold text-gray-900">ELIJAH</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              Security
            </span>
          </div>

          {nav.map((item, idx) => {
            if ('separator' in item && item.separator) {
              return (
                <div key={idx} className="pb-1 pt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {item.label}
                </div>
              )
            }

            if (!('href' in item)) return null

            const Icon = iconMap[item.icon]
            const isActive = item.href === '/elijah'
              ? pathname === '/elijah'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {Icon && <Icon className={cn('h-4 w-4', isActive ? 'text-red-600' : 'text-gray-400')} />}
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Page Content */}
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}
