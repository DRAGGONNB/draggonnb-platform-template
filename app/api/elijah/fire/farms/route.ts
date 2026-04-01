import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { createFarmSchema } from '@/lib/elijah/validations'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    // Return farms WITHOUT access_code (sensitive field gated via edge function)
    const { data, error } = await auth.supabase
      .from('elijah_fire_farm')
      .select('id, organization_id, name, owner_name, owner_phone, location, boundary, access_gate_location, access_notes, created_at, updated_at')
      .eq('organization_id', auth.organizationId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch farms' }, { status: 500 })
    }

    return NextResponse.json({ farms: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createFarmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, owner_name, owner_phone, location, access_gate_location, access_code, access_notes } = parsed.data

    const insertData: Record<string, unknown> = {
      organization_id: auth.organizationId,
      name,
      owner_name,
      owner_phone: owner_phone || null,
      location: `SRID=4326;POINT(${location.lng} ${location.lat})`,
      access_code: access_code || null,
      access_notes: access_notes || null,
    }

    if (access_gate_location) {
      insertData.access_gate_location = `SRID=4326;POINT(${access_gate_location.lng} ${access_gate_location.lat})`
    }

    const { data, error } = await auth.supabase
      .from('elijah_fire_farm')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create farm' }, { status: 500 })
    }

    return NextResponse.json({ farm: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
