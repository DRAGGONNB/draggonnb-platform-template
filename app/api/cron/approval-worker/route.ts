/**
 * app/api/cron/approval-worker/route.ts
 * Invoked by pg_net (pg-cron Job 2, migration 25) OR Vercel cron (vercel.json).
 *
 * Authentication accepts EITHER:
 *   - INTERNAL_CRON_SECRET (set by pg_net path with `x-internal-cron-secret` header)
 *   - CRON_SECRET (Vercel-managed, auto-injected via Authorization: Bearer header)
 *
 * BUGFIX (Phase 14 smoke): Vercel cron auto-injects Authorization: Bearer <CRON_SECRET>
 * which doesn't match INTERNAL_CRON_SECRET. Worker silently 401'd on every Vercel cron
 * tick, leaving approval_jobs queued forever.
 *
 * Note: Vercel cron uses GET; pg_net uses POST. Both are handled here.
 */

import { NextRequest } from 'next/server'
import { processApprovalJobs } from '@/lib/approvals/jobs/worker'

export const dynamic = 'force-dynamic'

async function handleRequest(req: NextRequest): Promise<Response> {
  const provided =
    req.headers.get('x-internal-cron-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '')

  const internal = process.env.INTERNAL_CRON_SECRET
  const vercelCron = process.env.CRON_SECRET
  const isAuthorized =
    !!provided && ((internal && provided === internal) || (vercelCron && provided === vercelCron))

  if (!isAuthorized) {
    return new Response('unauthorized', { status: 401 })
  }

  const result = await processApprovalJobs()
  return Response.json(result)
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleRequest(req)
}

// Vercel cron sends GET
export async function GET(req: NextRequest): Promise<Response> {
  return handleRequest(req)
}
