/**
 * POST /api/admin/orgs/[id]/archive
 *
 * Soft-archives an organization (sets `archived_at = now()`). Soft-archived orgs
 * stop resolving via subdomain (see lib/middleware/tenant-resolution.ts) but
 * their data is preserved.
 *
 * Guards:
 *   - 401 if no authenticated user.
 *   - 403 if user is not an admin.
 *   - 400 if the target org is the platform_admin org "DragoonB Business
 *     Automation" — that org can NEVER be archived via this route.
 *   - 404 if the target org doesn't exist.
 */
import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'

const PRESERVE_ORG_NAME = 'DragoonB Business Automation'
const PRESERVE_ORG_ID = '094a610d-2a05-44a4-9fa5-e6084bb632c9'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (userOrg.role !== 'admin' && userOrg.role !== 'platform_admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supa = createAdminClient()

  // Hard guard #1: never archive the platform_admin org by ID.
  if (id === PRESERVE_ORG_ID) {
    return Response.json(
      { error: 'cannot_archive_platform_admin' },
      { status: 400 },
    )
  }

  const { data: target } = await supa
    .from('organizations')
    .select('id, name')
    .eq('id', id)
    .single()
  if (!target) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  // Hard guard #2: never archive the platform_admin org by name.
  if (target.name === PRESERVE_ORG_NAME) {
    return Response.json(
      { error: 'cannot_archive_platform_admin' },
      { status: 400 },
    )
  }

  const { error: updErr } = await supa
    .from('organizations')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .is('archived_at', null) // idempotent: don't double-archive
  if (updErr) {
    return Response.json(
      { error: 'archive_failed', detail: updErr.message },
      { status: 500 },
    )
  }

  return Response.json({ ok: true })
}
