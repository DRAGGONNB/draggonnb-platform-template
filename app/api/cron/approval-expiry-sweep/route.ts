/**
 * app/api/cron/approval-expiry-sweep/route.ts
 * Vercel cron fallback for expiry sweep (used when pg_net is unavailable OR as defense-in-depth).
 * pg-cron Job 1 (migration 25) does the same work inline on a 5-min SQL schedule.
 *
 * Authentication: x-internal-cron-secret header (INTERNAL_CRON_SECRET env var).
 * Vercel cron sends GET requests.
 */

import { NextRequest } from 'next/server'
import { sweepExpiredApprovals } from '@/lib/approvals/expiry-sweep'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const provided =
    req.headers.get('x-internal-cron-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (provided !== process.env.INTERNAL_CRON_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const result = await sweepExpiredApprovals()
  return Response.json(result)
}
