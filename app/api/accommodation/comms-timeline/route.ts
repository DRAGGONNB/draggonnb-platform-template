import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createCommsTimelineSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const guestId = searchParams.get('guest_id')
    const channel = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = auth.supabase
      .from('accommodation_comms_timeline')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (bookingId) query = query.eq('booking_id', bookingId)
    if (guestId) query = query.eq('guest_id', guestId)
    if (channel) query = query.eq('channel', channel)

    const { data: entries, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch comms timeline' }, { status: 500 })
    }

    return NextResponse.json({ entries: entries || [], total: count || 0, limit, offset })
  } catch (error) {
    console.error('Comms timeline GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createCommsTimelineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: entry, error } = await auth.supabase
      .from('accommodation_comms_timeline')
      .insert({
        organization_id: auth.organizationId,
        sent_by: auth.userId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create comms entry' }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Comms timeline POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
