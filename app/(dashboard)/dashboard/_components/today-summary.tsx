import { Users, Briefcase, Hotel, UtensilsCrossed, Shield, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SummaryTile {
  id: string
  label: string
  value: string
  hint?: string
  icon: 'Users' | 'Briefcase' | 'Hotel' | 'UtensilsCrossed' | 'Shield' | 'Mail'
  tone: 'crimson' | 'emerald' | 'amber' | 'blue' | 'purple'
}

const ICON_MAP: Record<SummaryTile['icon'], LucideIcon> = {
  Users,
  Briefcase,
  Hotel,
  UtensilsCrossed,
  Shield,
  Mail,
}

const TONE_BG: Record<SummaryTile['tone'], string> = {
  crimson: 'bg-[#6B1420]/10 text-[#6B1420]',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
}

export function TodaySummary({ tiles }: { tiles: SummaryTile[] }) {
  if (tiles.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No active modules — activate a module from <span className="font-medium">Settings</span> to
        see metrics here.
      </div>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = ICON_MAP[tile.icon]
        return (
          <div
            key={tile.id}
            data-summary-tile={tile.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{tile.label}</p>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_BG[tile.tone]}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{tile.value}</p>
            {tile.hint && <p className="mt-1 text-xs text-gray-500">{tile.hint}</p>}
          </div>
        )
      })}
    </div>
  )
}
