import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createHouseholdSchema } from '@/lib/elijah/validations'

export async function GET(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const section_id = searchParams.get('section_id')

    let query = auth.supabase
      .from('elijah_household')
      .select(`
        *,
        section:elijah_section(id, name),
        primary_contact:elijah_member!primary_contact_id(id, display_name, phone),
        members:elijah_member(id, display_name)
      `)
      .eq('organization_id', auth.organizationId)
      .order('address')

    if (section_id) query = query.eq('section_id', section_id)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch households' }, { status: 500 })
    }

    return NextResponse.json({ households: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createHouseholdSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_household')
      .insert({ organization_id: auth.organizationId, ...parsed.data })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create household' }, { status: 500 })
    }

    return NextResponse.json({ household: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
