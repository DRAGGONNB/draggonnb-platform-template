/**
 * app/api/approvals/[id]/approve/route.ts
 * POST /api/approvals/:id/approve
 * Web fallback approve endpoint — calls spine.approveRequest() which enforces D2 product-scoped permission.
 */

import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { approveRequest } from '@/lib/approvals/spine'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return Response.json({ error: 'auth required' }, { status: 401 })
  }
  if (!['admin', 'manager'].includes(userOrg.role)) {
    return Response.json({ error: 'no permission' }, { status: 403 })
  }

  try {
    // Note: spine.approveRequest internally calls verifyProductPermission (W4 / D2)
    // and throws 'no permission for this product' if org lacks the product module.
    const result = await approveRequest(params.id, userOrg.userId)
    return Response.json(result)
  } catch (e: any) {
    if (String(e?.message ?? '').includes('no permission')) {
      return Response.json({ error: e.message }, { status: 403 })
    }
    if (String(e?.message ?? '').includes('approval not found')) {
      return Response.json({ error: e.message }, { status: 404 })
    }
    console.error('[api/approve]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
