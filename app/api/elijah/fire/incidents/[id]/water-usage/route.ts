import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'
import { logWaterUsageSchema } from '@/lib/elijah/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data, error } = await auth.supabase
      .from('elijah_fire_incident_water_usage')
      .select(`
        *,
        water_point:elijah_fire_water_point(id, name, type),
        logger:elijah_member!logged_by(id, display_name)
      `)
      .eq('fire_incident_id', id)
      .order('logged_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch water usage' }, { status: 500 })
    }

    const totalLitres = (data || []).reduce((sum, r) => sum + (r.litres_used || 0), 0)

    return NextResponse.json({ usage: data || [], total_litres: totalLitres })
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
    const parsed = logWaterUsageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: member } = await auth.supabase
      .from('elijah_member')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Elijah member not found' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('elijah_fire_incident_water_usage')
      .insert({
        fire_incident_id: id,
        water_point_id: parsed.data.water_point_id,
        litres_used: parsed.data.litres_used,
        reload_time_min: parsed.data.reload_time_min || null,
        notes: parsed.data.notes || null,
        logged_by: member.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to log water usage' }, { status: 500 })
    }

    return NextResponse.json({ usage: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
