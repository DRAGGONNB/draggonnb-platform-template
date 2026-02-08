'use client'

import { Search, Bell, HelpCircle } from 'lucide-react'

interface DashboardHeaderProps {
  onNewClick?: () => void
}

export function DashboardHeader({ onNewClick }: DashboardHeaderProps) {
  return (
    <header className="fixed left-64 right-0 top-0 z-30 border-b bg-white">
      <div className="flex h-18 flex-col justify-between px-8">
        {/* Top Row */}
        <div className="flex items-center gap-4 pt-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search everything..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-600 placeholder-gray-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Right Side Actions */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={onNewClick}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              + New
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-all hover:border-gray-300 hover:bg-white">
              <Bell className="h-4 w-4" />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-all hover:border-gray-300 hover:bg-white">
              <HelpCircle className="h-4 w-4" />
            </button>

            <button className="h-10 w-10 rounded-full border border-gray-200 bg-gradient-to-br from-blue-600 to-blue-800 transition-all hover:shadow-lg">
              <span className="sr-only">User menu</span>
            </button>
          </div>
        </div>

        {/* Bottom Row - Breadcrumb */}
        <div className="flex items-center gap-2 pb-3 text-xs text-gray-500">
          <span>Dashboard</span>
          <span className="text-gray-300">→</span>
          <span>Analytics</span>
        </div>
      </div>
    </header>
  )
}
