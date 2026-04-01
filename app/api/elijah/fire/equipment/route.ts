import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createEquipmentSchema } from '@/lib/elijah/validations'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const { data, error } = await auth.supabase
      .from('elijah_fire_equipment')
      .select('*, group:elijah_fire_responder_group(id, name)')
      .eq('organization_id', auth.organizationId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
    }

    return NextResponse.json({ equipment: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createEquipmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_fire_equipment')
      .insert({ organization_id: auth.organizationId, ...parsed.data })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
    }

    return NextResponse.json({ equipment: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
