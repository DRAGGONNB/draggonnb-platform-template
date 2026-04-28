/**
 * Returns the banner threshold (0.50, 0.75, 0.90) given used/limit, or null
 * if below 50%. Pure helper — used by dashboard layout (server component) to
 * decide whether to render a usage banner per metric, AND by the
 * UsageWarningBanner client component itself.
 *
 * Lives in a pure (non-'use client') module so server components can import
 * it without Next.js silently dropping non-component exports across the
 * server/client bundle boundary in production builds.
 */
export function thresholdFor(used: number, limit: number): 0.5 | 0.75 | 0.9 | null {
  if (limit <= 0) return null
  const ratio = used / limit
  if (ratio >= 0.9) return 0.9
  if (ratio >= 0.75) return 0.75
  if (ratio >= 0.5) return 0.5
  return null
}
