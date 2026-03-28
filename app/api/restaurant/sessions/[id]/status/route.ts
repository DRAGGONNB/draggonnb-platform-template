import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { UpdateSessionStatusSchema } from '@/lib/restaurant/schemas'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = UpdateSessionStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()
  const { status, notes } = parsed.data

  const updates: Record<string, unknown> = { status }
  if (notes) updates.notes = notes
  if (status === 'closed' || status === 'voided') updates.closed_at = new Date().toISOString()

  const { data, error } = await admin
    .from('table_sessions')
    .update(updates)
    .eq('id', params.id)
    .eq('organization_id', auth.organizationId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // If bill_requested: update associated bill status
  if (status === 'bill_requested') {
    await admin
      .from('bills')
      .update({ status: 'pending_payment', updated_at: new Date().toISOString() })
      .eq('session_id', params.id)
  }

  return NextResponse.json({ session: data })
}
