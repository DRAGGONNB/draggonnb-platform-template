import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { rollcallCheckinSchema } from '@/lib/elijah/validations'

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = rollcallCheckinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    const { data, error } = await auth.supabase
      .from('elijah_rollcall_checkin')
      .insert({
        schedule_id: parsed.data.schedule_id,
        household_id: parsed.data.household_id,
        status: parsed.data.status,
        checked_in_by: member?.id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
    }

    // If status is 'help', auto-create incident
    if (parsed.data.status === 'help' && member) {
      await auth.supabase.from('elijah_incident').insert({
        organization_id: auth.organizationId,
        type: 'other',
        severity: 'high',
        status: 'open',
        description: 'Household requested help during roll call',
        reported_by: member.id,
      })
    }

    return NextResponse.json({ checkin: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
