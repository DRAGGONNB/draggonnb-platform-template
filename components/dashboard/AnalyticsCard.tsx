import { BarChart3 } from 'lucide-react'
import { EmptyState } from './EmptyState'

interface AnalyticsSnapshot {
  id: string
  snapshot_date: string
  total_posts_24h?: number
  platforms_used?: string[]
  linkedin_engagements?: number
  facebook_engagements?: number
  instagram_engagements?: number
  collected_at?: string
  created_at?: string
}

interface AnalyticsCardProps {
  snapshots: AnalyticsSnapshot[]
}

export function AnalyticsCard({ snapshots }: AnalyticsCardProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Content Analytics
        </h3>
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Analytics will appear after your first content is published. The collector runs daily at 6 AM."
        />
      </div>
    )
  }

  // Most recent snapshot
  const latest = snapshots[snapshots.length - 1]

  // Calculate totals from available snapshots (up to 7 days)
  const weekTotal = snapshots.reduce(
    (sum, s) => sum + (s.total_posts_24h || 0),
    0
  )

  // Get unique platforms from snapshots
  const allPlatforms = [
    ...new Set(snapshots.flatMap((s) => s.platforms_used || [])),
  ]

  // Calculate total engagements from latest
  const totalEngagements =
    (latest.linkedin_engagements || 0) +
    (latest.facebook_engagements || 0) +
    (latest.instagram_engagements || 0)

  const dateLabel = latest.collected_at || latest.created_at || latest.snapshot_date

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Content Analytics
        </h3>
        <span className="text-xs text-gray-400">
          {dateLabel
            ? new Date(dateLabel).toLocaleDateString('en-ZA')
            : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Posts (24h)</p>
          <p className="text-2xl font-bold text-gray-900">
            {latest.total_posts_24h || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Posts (7 days)</p>
          <p className="text-2xl font-bold text-gray-900">{weekTotal}</p>
        </div>
      </div>

      {totalEngagements > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500">Total Engagements</p>
          <p className="text-xl font-bold text-gray-900">{totalEngagements}</p>
        </div>
      )}

      {allPlatforms.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-gray-500">Active Platforms</p>
          <div className="flex flex-wrap gap-2">
            {allPlatforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
