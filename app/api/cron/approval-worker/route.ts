/**
 * app/api/cron/approval-worker/route.ts
 * Invoked by pg_net (pg-cron Job 2, migration 25) OR Vercel cron (vercel.json).
 * Authentication: x-internal-cron-secret header (INTERNAL_CRON_SECRET env var).
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

  if (provided !== process.env.INTERNAL_CRON_SECRET) {
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
