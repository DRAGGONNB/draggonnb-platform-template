import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { CreateTempLogSchema, getTempStatus } from '@/lib/restaurant/schemas'

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const admin = createAdminClient()
  let query = admin
    .from('temp_logs')
    .select('*, restaurant_staff(display_name)')
    .eq('organization_id', auth.organizationId)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59`)
    .order('logged_at', { ascending: false })

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = CreateTempLogSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  // Compute R638 compliance status
  const status = getTempStatus(parsed.data.equipment_type, parsed.data.temperature)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('temp_logs')
    .insert({
      ...parsed.data,
      organization_id: auth.organizationId,
      status,
      logged_by: auth.userId !== 'service' ? auth.userId : null,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger critical alert via N8N
  if (status === 'critical') {
    const n8nBase = process.env.N8N_BASE_URL
    if (n8nBase) {
      fetch(`${n8nBase}/webhook/temp-critical-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY || '' },
        body: JSON.stringify({
          logId: data.id,
          restaurantId: parsed.data.restaurant_id,
          organizationId: auth.organizationId,
          equipmentName: parsed.data.equipment_name,
          equipmentType: parsed.data.equipment_type,
          temperature: parsed.data.temperature,
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ log: data, status }, { status: 201 })
}
