'use client'

import Link from 'next/link'

interface BannerProps {
  metric: string
  used: number
  limit: number
  threshold: 0.5 | 0.75 | 0.9
}

const COPY: Record<string, string> = {
  agent_invocations: 'AI agent invocations',
  email_sends: 'email sends',
  social_posts: 'social media posts',
  ai_generations: 'AI content generations',
  receipt_ocr: 'receipt OCR scans',
  campaign_runs: 'campaign runs',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-50 border-blue-200 text-blue-900',
  medium: 'bg-amber-50 border-amber-200 text-amber-900',
  high: 'bg-red-50 border-red-200 text-red-900',
}

/**
 * USAGE-03: usage warning banner.
 * Renders at 50%/75%/90% of any monthly usage cap.
 * Embedded by app/(dashboard)/layout.tsx via Task 1b.
 */
export function UsageWarningBanner({ metric, used, limit, threshold }: BannerProps) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0
  const label = COPY[metric] ?? metric
  const severity = threshold === 0.9 ? 'high' : threshold === 0.75 ? 'medium' : 'low'

  return (
    <div
      className={`rounded-lg border p-4 ${SEVERITY_COLORS[severity]}`}
      data-testid={`usage-warning-banner-${metric}`}
      data-severity={severity}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <p className="font-semibold">
            You&apos;ve used {pct}% of your monthly {label}.
          </p>
          <p className="text-sm mt-1">
            {used.toLocaleString()} of {limit.toLocaleString()} this month.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/pricing"
            className="text-sm px-3 py-1 bg-[#6B1420] text-white rounded hover:bg-[#5a1019]"
          >
            Upgrade
          </Link>
          <Link
            href="/dashboard/billing/topups"
            className="text-sm px-3 py-1 border border-current rounded hover:bg-white/40"
          >
            Buy Overage
          </Link>
        </div>
      </div>
    </div>
  )
}

// `thresholdFor` was extracted to lib/usage/banner-threshold.ts so the
// dashboard server-component layout can import it without crossing the
// 'use client' bundle boundary. In production builds, Next.js drops
// non-component exports from client modules, which caused the dashboard
// layout to throw 'TypeError: c is not a function' at SSR.
// Re-exported here for any callsite that already imports from this module.
export { thresholdFor } from '@/lib/usage/banner-threshold'
