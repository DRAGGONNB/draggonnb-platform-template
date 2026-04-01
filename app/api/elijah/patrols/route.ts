import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createPatrolSchema } from '@/lib/elijah/validations'

export async function GET(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = auth.supabase
      .from('elijah_patrol')
      .select(`
        *,
        section:elijah_section(id, name),
        assignments:elijah_patrol_assignment(
          member:elijah_member(id, display_name)
        )
      `)
      .eq('organization_id', auth.organizationId)
      .order('scheduled_date', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch patrols' }, { status: 500 })
    }

    return NextResponse.json({ patrols: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createPatrolSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_patrol')
      .insert({ organization_id: auth.organizationId, ...parsed.data })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create patrol' }, { status: 500 })
    }

    return NextResponse.json({ patrol: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
