import { Activity, Mail, Briefcase, Hotel, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ActivityRow {
  id: string
  source: 'crm_activity' | 'campaign_run' | 'booking' | 'content'
  description: string
  occurred_at: string
  actor?: string | null
}

const ICON_MAP: Record<ActivityRow['source'], LucideIcon> = {
  crm_activity: Briefcase,
  campaign_run: Mail,
  booking: Hotel,
  content: FileText,
}

function formatRelative(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-500">No activity yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Send a campaign, log a deal or create a booking to see events here.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <ul className="divide-y divide-gray-100">
        {rows.map((row) => {
          const Icon = ICON_MAP[row.source] ?? Activity
          return (
            <li
              key={row.id}
              data-activity-row={row.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{row.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatRelative(row.occurred_at)}
                  {row.actor && <span> · {row.actor}</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
