import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { OpenSessionSchema } from '@/lib/restaurant/schemas'

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const status = searchParams.get('status') || 'open'

  let query = admin
    .from('table_sessions')
    .select(`
      *,
      restaurant_tables(id, label, section, capacity),
      restaurant_staff(id, display_name, role),
      bills(id, subtotal, service_charge, tip_total, total, status, bill_items(id, name, quantity, unit_price, line_total, voided))
    `)
    .eq('organization_id', auth.organizationId)
    .eq('status', status)
    .order('opened_at', { ascending: false })

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = OpenSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { table_id, waiter_id, party_size, split_mode, guest_whatsapp, notes } = parsed.data
  const admin = createAdminClient()

  // Verify no open session already exists for this table
  const { data: existing } = await admin
    .from('table_sessions')
    .select('id')
    .eq('table_id', table_id)
    .eq('status', 'open')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Table already has an open session', sessionId: existing.id }, { status: 409 })
  }

  // Get restaurant_id from table
  const { data: table } = await admin
    .from('restaurant_tables')
    .select('restaurant_id')
    .eq('id', table_id)
    .eq('organization_id', auth.organizationId)
    .single()

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  }

  // Open session
  const { data: session, error: sessionError } = await admin
    .from('table_sessions')
    .insert({
      organization_id: auth.organizationId,
      restaurant_id: table.restaurant_id,
      table_id,
      waiter_id,
      party_size,
      split_mode,
      guest_whatsapp: guest_whatsapp || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message }, { status: 500 })
  }

  // Create associated bill immediately
  const { data: restaurantData } = await admin
    .from('restaurants')
    .select('service_charge_pct')
    .eq('id', table.restaurant_id)
    .single()

  const { data: bill } = await admin
    .from('bills')
    .insert({
      organization_id: auth.organizationId,
      session_id: session.id,
      restaurant_id: table.restaurant_id,
      service_charge_pct: restaurantData?.service_charge_pct ?? 0,
    })
    .select('id')
    .single()

  // Create payer slots for equal/by_item splits
  if (split_mode !== 'none' && party_size > 1 && bill) {
    const slots = Array.from({ length: party_size }, (_, i) => ({
      organization_id: auth.organizationId,
      bill_id: bill.id,
      slot_number: i + 1,
    }))
    await admin.from('bill_payers').insert(slots)
  }

  return NextResponse.json({ session, billId: bill?.id }, { status: 201 })
}
