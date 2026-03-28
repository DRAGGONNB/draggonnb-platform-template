import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { CreateTableSchema, UpdateTableSchema } from '@/lib/restaurant/schemas'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')

  const admin = createAdminClient()
  let query = admin
    .from('restaurant_tables')
    .select(`
      *,
      table_sessions(id, status, party_size, opened_at, waiter_id, restaurant_staff(display_name))
    `)
    .eq('organization_id', auth.organizationId)
    .eq('is_active', true)
    .order('label')

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Annotate each table with its current open session
  const tables = (data ?? []).map(table => {
    const sessions = table.table_sessions as unknown as Array<{ id: string; status: string }> | null
    const activeSession = sessions?.find(s => s.status === 'open') ?? null
    return { ...table, activeSession, table_sessions: undefined }
  })

  return NextResponse.json({ tables })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const parsed = CreateTableSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()

  // Get restaurant slug for QR URL
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('slug')
    .eq('id', parsed.data.restaurant_id)
    .single()

  const { data: table, error } = await admin
    .from('restaurant_tables')
    .insert({ ...parsed.data, organization_id: auth.organizationId })
    .select().single()

  if (error || !table) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Build QR URL
  const qrUrl = restaurant?.slug
    ? `${APP_URL}/r/${restaurant.slug}/${table.qr_token}`
    : null

  // Store QR URL back on the record
  if (qrUrl) {
    await admin.from('restaurant_tables').update({ qr_code_url: qrUrl }).eq('id', table.id)
  }

  return NextResponse.json({ table: { ...table, qr_code_url: qrUrl } }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const parsed = UpdateTableSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurant_tables')
    .update(parsed.data)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ table: data })
}
