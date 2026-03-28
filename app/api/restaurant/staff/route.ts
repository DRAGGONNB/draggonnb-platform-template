import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { CreateStaffSchema, UpdateStaffSchema } from '@/lib/restaurant/schemas'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')

  const admin = createAdminClient()
  let query = admin
    .from('restaurant_staff')
    .select('id, display_name, role, employment_type, phone, telegram_chat_id, whatsapp_number, is_active, created_at')
    .eq('organization_id', auth.organizationId)
    .eq('is_active', true)
    .order('display_name')

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = CreateStaffSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const insertData: Record<string, unknown> = { ...parsed.data, organization_id: auth.organizationId }

  // Hash PIN if provided
  if (body.pin) {
    insertData.pin_hash = crypto.createHash('sha256').update(String(body.pin)).digest('hex')
  }

  const { data, error } = await admin
    .from('restaurant_staff')
    .insert(insertData)
    .select('id, display_name, role, employment_type, phone, telegram_chat_id, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { id, pin, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const parsed = UpdateStaffSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (pin) updateData.pin_hash = crypto.createHash('sha256').update(String(pin)).digest('hex')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurant_staff')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select('id, display_name, role, is_active').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}
