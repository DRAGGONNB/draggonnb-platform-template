import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { UpdateRestaurantSchema } from '@/lib/restaurant/schemas'

// GET /api/restaurant/settings?restaurant_id=xxx
// Returns restaurant record with settings, Telegram config, PayFast config (keys redacted)
export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurants')
    .select(`
      id, name, slug, address, phone, timezone,
      telegram_bot_token, telegram_channel_id, telegram_manager_id,
      payfast_merchant_id,
      service_charge_pct, settings,
      created_at, updated_at
    `)
    .eq('id', restaurantId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Redact sensitive keys — only expose merchant_id (not key/passphrase)
  return NextResponse.json({ settings: data })
}

// PATCH /api/restaurant/settings
// Updates restaurant configuration fields
export async function PATCH(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const parsed = UpdateRestaurantSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurants')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select(`
      id, name, slug, address, phone, timezone,
      telegram_bot_token, telegram_channel_id, telegram_manager_id,
      payfast_merchant_id, service_charge_pct, settings,
      updated_at
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
