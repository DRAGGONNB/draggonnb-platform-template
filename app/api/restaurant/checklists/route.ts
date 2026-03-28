import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantAuth, isRestaurantAuthError } from '@/lib/restaurant/api-helpers'
import { CreateChecklistSchema, CompleteChecklistSchema } from '@/lib/restaurant/schemas'

export async function GET(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  const type = searchParams.get('type') // 'templates' | 'completions'
  const date = searchParams.get('date')

  const admin = createAdminClient()

  if (type === 'completions') {
    let query = admin
      .from('checklist_completions')
      .select('*, restaurant_checklists(name, checklist_type), restaurant_staff(display_name)')
      .eq('organization_id', auth.organizationId)
      .order('completion_date', { ascending: false })
      .limit(100)

    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
    if (date) query = query.eq('completion_date', date)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ completions: data })
  }

  // Default: return checklist templates
  let query = admin
    .from('restaurant_checklists')
    .select('*')
    .eq('organization_id', auth.organizationId)
    .eq('is_active', true)
    .order('checklist_type').order('name')

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checklists: data })
}

export async function POST(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'complete' | undefined (create template)

  const admin = createAdminClient()

  if (action === 'complete') {
    const parsed = CompleteChecklistSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const completedCount = parsed.data.items_completed.filter(i => i.completed).length
    const totalCount = parsed.data.items_completed.length
    const allCompleted = completedCount === totalCount

    const { data, error } = await admin
      .from('checklist_completions')
      .insert({
        ...parsed.data,
        organization_id: auth.organizationId,
        completed_by: auth.userId !== 'service' ? auth.userId : null,
        all_completed: allCompleted,
        items_total: totalCount,
        items_completed_count: completedCount,
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ completion: data }, { status: 201 })
  }

  // Create checklist template
  const parsed = CreateChecklistSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await admin
    .from('restaurant_checklists')
    .insert({ ...parsed.data, organization_id: auth.organizationId })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checklist: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await getRestaurantAuth(request)
  if (isRestaurantAuthError(auth)) return auth

  const body = await request.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const parsed = CreateChecklistSchema.partial().safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurant_checklists')
    .update(parsed.data)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checklist: data })
}
