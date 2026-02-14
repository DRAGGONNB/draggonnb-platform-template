import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()

    const { data: room, error } = await auth.supabase
      .from('accommodation_rooms')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !room) {
      return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Room PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { error } = await auth.supabase
      .from('accommodation_rooms')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Room DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
