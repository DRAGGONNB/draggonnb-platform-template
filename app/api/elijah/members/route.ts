import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createMemberSchema } from '@/lib/elijah/validations'

export async function GET(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const section_id = searchParams.get('section_id')

    let query = auth.supabase
      .from('elijah_member')
      .select(`
        *,
        roles:elijah_member_role(role),
        household:elijah_household(id, address, unit_number, section_id)
      `)
      .eq('organization_id', auth.organizationId)
      .order('display_name')

    if (section_id) {
      query = query.eq('household.section_id', section_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    return NextResponse.json({ members: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { display_name, phone, household_id, roles } = parsed.data

    const { data: member, error } = await auth.supabase
      .from('elijah_member')
      .insert({
        organization_id: auth.organizationId,
        user_id: parsed.data.user_id || auth.userId,
        display_name,
        phone: phone || null,
        household_id: household_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
    }

    // Assign roles if provided
    if (roles && roles.length > 0) {
      const roleInserts = roles.map(role => ({
        member_id: member.id,
        role,
      }))
      await auth.supabase.from('elijah_member_role').insert(roleInserts)
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
