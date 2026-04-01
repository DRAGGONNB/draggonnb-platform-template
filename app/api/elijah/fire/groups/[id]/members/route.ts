import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { addGroupMemberSchema } from '@/lib/elijah/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('elijah_fire_responder_group_member')
      .select('*, member:elijah_member(id, display_name, phone)')
      .eq('group_id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 })
    }

    return NextResponse.json({ members: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = addGroupMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_fire_responder_group_member')
      .insert({ group_id: id, ...parsed.data })
      .select('*, member:elijah_member(id, display_name)')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add member to group' }, { status: 500 })
    }

    return NextResponse.json({ member: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
