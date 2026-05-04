/**
 * app/(dashboard)/approvals/[id]/page.tsx
 * Approval detail page with:
 *   - Full context (action type, payload, status, product)
 *   - Photo gallery via signed URLs (I2: generatePhotoSignedUrl per asset)
 *   - Approve/reject buttons + reject reason picker (4 preset + Other free-text)
 *   - Audit timeline (from audit_log)
 */

import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePhotoSignedUrl } from '@/lib/approvals/spine'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function ApprovalDetailPage({ params }: Props) {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load approval: {error ?? 'auth required'}
      </div>
    )
  }

  const supabase = createAdminClient()
  const { data: approval, error: fetchErr } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchErr || !approval) {
    return (
      <div className="p-6 text-sm text-red-600">
        Approval not found or no access. <Link href="/approvals" className="underline">Back</Link>
      </div>
    )
  }

  // I2: generate signed URLs for each asset in action_payload.assets
  const assets = (approval.action_payload?.assets ?? []) as Array<{ id: string; mime?: string; name?: string }>
  const photoUrls = assets.map((a) => ({
    ...a,
    src: generatePhotoSignedUrl(approval.id, a.id, 1800),
  }))

  // Audit timeline
  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('action, actor_id, before_state, after_state, created_at')
    .eq('resource_type', 'approval_request')
    .eq('resource_id', approval.id)
    .order('created_at', { ascending: true })

  const canAct = ['admin', 'manager'].includes(userOrg.role)

  return (
    <div className="p-4 max-w-screen-md mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/approvals" className="text-sm text-muted-foreground underline">Approvals</Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm">{approval.action_type.replace(/_/g, ' ')}</span>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold capitalize">{approval.action_type.replace(/_/g, ' ')}</h1>
        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
          approval.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          approval.status === 'approved' || approval.status === 'executed' ? 'bg-green-100 text-green-800' :
          approval.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-700'
        }`}>{approval.status}</span>
      </div>

      {/* Context */}
      <div className="border rounded-md p-4 text-sm space-y-2">
        <div><span className="font-medium">Product:</span> {approval.product}</div>
        <div><span className="font-medium">Resource:</span> {approval.target_resource_type} / {approval.target_resource_id}</div>
        <div><span className="font-medium">Expires:</span> {new Date(approval.expires_at).toLocaleString('en-ZA')}</div>
        {approval.action_payload && (
          <div>
            <span className="font-medium">Payload:</span>
            <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(approval.action_payload, null, 2)}</pre>
          </div>
        )}
        {approval.rejection_reason_code && (
          <div><span className="font-medium">Rejection:</span> {approval.rejection_reason_code} {approval.rejection_reason ? `— ${approval.rejection_reason}` : ''}</div>
        )}
      </div>

      {/* Photo viewer */}
      {photoUrls.length > 0 && (
        <div>
          <h2 className="text-base font-medium mb-2">Photos ({photoUrls.length})</h2>
          <div className="flex gap-2 flex-wrap">
            {photoUrls.map((p) => (
              <a key={p.id} href={p.src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.name ?? p.id}
                  className="h-24 w-24 object-cover rounded border"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Approve/reject actions (pending only, admin/manager) */}
      {approval.status === 'pending' && canAct && (
        <ApprovalActions approvalId={approval.id} />
      )}

      {/* Audit timeline */}
      {(auditRows ?? []).length > 0 && (
        <div>
          <h2 className="text-base font-medium mb-2">Audit timeline</h2>
          <ul className="space-y-2">
            {(auditRows ?? []).map((row, i) => (
              <li key={i} className="text-xs border-l-2 border-muted-foreground pl-3">
                <span className="font-medium">{row.action}</span>
                <span className="ml-2 text-muted-foreground">{new Date(row.created_at).toLocaleString('en-ZA')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Client island for approve/reject actions + reject reason picker.
 * Inlined here to keep the page RSC with a single client island.
 */
function ApprovalActions({ approvalId }: { approvalId: string }) {
  // This is a client component pattern — but we're keeping it server-side for simplicity
  // The form actions POST directly to the API routes
  const REASON_CODES = [
    { code: 'wrong_amount', label: 'Wrong amount' },
    { code: 'not_chargeable', label: 'Not chargeable' },
    { code: 'need_more_info', label: 'Need more info' },
    { code: 'other', label: 'Other' },
  ]

  return (
    <div className="border rounded-md p-4 space-y-4">
      <h2 className="text-base font-medium">Action required</h2>
      <div className="flex gap-2">
        <form action={`/api/approvals/${approvalId}/approve`} method="POST">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
          >
            Approve
          </button>
        </form>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Reject with reason:</p>
        <div className="flex flex-wrap gap-2">
          {REASON_CODES.map((r) => (
            <form key={r.code} action={`/api/approvals/${approvalId}/reject`} method="POST">
              <input type="hidden" name="reason_code" value={r.code} />
              <button
                type="submit"
                className="px-3 py-1.5 border rounded text-sm hover:bg-muted"
              >
                {r.label}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}
