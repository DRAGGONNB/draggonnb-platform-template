import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { CreateMenuCategorySchema, CreateMenuItemSchema, UpdateMenuItemSchema } from '@/lib/restaurant/schemas'
import { z } from 'zod'

const TypeSchema = z.enum(['categories', 'items'])

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'items'
  const restaurantId = searchParams.get('restaurant_id')

  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const admin = createAdminClient()

  if (type === 'categories') {
    const { data, error } = await admin
      .from('menu_categories')
      .select('*, menu_items(id, name, price, is_available, sort_order)')
      .eq('organization_id', auth.organizationId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ categories: data })
  }

  const { data, error } = await admin
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('organization_id', auth.organizationId)
    .eq('restaurant_id', restaurantId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const admin = createAdminClient()

  if (body.type === 'category') {
    const parsed = CreateMenuCategorySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const { data, error } = await admin
      .from('menu_categories')
      .insert({ ...parsed.data, organization_id: auth.organizationId })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ category: data }, { status: 201 })
  }

  const parsed = CreateMenuItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await admin
    .from('menu_items')
    .insert({ ...parsed.data, organization_id: auth.organizationId })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { id, ...rest } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const parsed = UpdateMenuItemSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('menu_items')
    .update(parsed.data)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
