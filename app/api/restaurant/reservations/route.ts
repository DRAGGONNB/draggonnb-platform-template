import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { CreateReservationSchema, UpdateReservationSchema } from '@/lib/restaurant/schemas'

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const date = searchParams.get('date')
  const status = searchParams.get('status')

  const admin = createAdminClient()
  let query = admin
    .from('reservations')
    .select('*, contacts(first_name, last_name, phone), restaurant_tables(label, section)')
    .eq('organization_id', auth.organizationId)
    .order('reservation_date').order('reservation_time')

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  if (date) query = query.eq('reservation_date', date)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservations: data })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = CreateReservationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reservations')
    .insert({ ...parsed.data, organization_id: auth.organizationId })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger N8N confirmation workflow
  const n8nBase = process.env.N8N_BASE_URL
  if (n8nBase && data.whatsapp_number) {
    fetch(`${n8nBase}/webhook/reservation-created`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY || '' },
      body: JSON.stringify({ reservationId: data.id, organizationId: auth.organizationId }),
    }).catch(() => {})
  }

  return NextResponse.json({ reservation: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const parsed = UpdateReservationSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reservations')
    .update(parsed.data)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservation: data })
}
