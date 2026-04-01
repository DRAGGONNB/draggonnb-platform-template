import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createRollcallScheduleSchema } from '@/lib/elijah/validations'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { data, error } = await auth.supabase
      .from('elijah_rollcall_schedule')
      .select('*, section:elijah_section(id, name)')
      .eq('organization_id', auth.organizationId)
      .order('time')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    return NextResponse.json({ schedules: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createRollcallScheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_rollcall_schedule')
      .insert({ organization_id: auth.organizationId, ...parsed.data })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
    }

    return NextResponse.json({ schedule: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
