/**
 * app/api/approvals/[id]/reject/route.ts
 * POST /api/approvals/:id/reject
 * Web fallback reject endpoint — reads { reason_code, reason_text? } from body or form data.
 * Calls spine.rejectRequest() which enforces D2 product-scoped permission.
 */

import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { rejectRequest } from '@/lib/approvals/spine'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return Response.json({ error: 'auth required' }, { status: 401 })
  }
  if (!['admin', 'manager'].includes(userOrg.role)) {
    return Response.json({ error: 'no permission' }, { status: 403 })
  }

  // Support both JSON body and form-encoded (for direct form submissions from detail page)
  let reasonCode = ''
  let reasonText: string | undefined

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}))
    reasonCode = body.reason_code ?? ''
    reasonText = body.reason_text
  } else {
    // form-encoded
    const formData = await req.formData().catch(() => null)
    reasonCode = formData?.get('reason_code') as string ?? ''
    reasonText = formData?.get('reason_text') as string | undefined
  }

  if (!reasonCode) {
    return Response.json({ error: 'reason_code required' }, { status: 400 })
  }

  try {
    const result = await rejectRequest(params.id, userOrg.userId, reasonCode, reasonText)

    // If this came from a form submission, redirect back to the approval
    if (!contentType.includes('application/json')) {
      return Response.redirect(new URL(`/approvals/${params.id}`, req.url), 303)
    }
    return Response.json(result)
  } catch (e: any) {
    if (String(e?.message ?? '').includes('no permission')) {
      return Response.json({ error: e.message }, { status: 403 })
    }
    if (String(e?.message ?? '').includes('approval not found')) {
      return Response.json({ error: e.message }, { status: 404 })
    }
    console.error('[api/reject]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
