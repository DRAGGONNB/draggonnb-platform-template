import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data: entry, error } = await auth.supabase
      .from('accommodation_comms_timeline')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !entry) {
      return NextResponse.json({ error: 'Comms entry not found' }, { status: 404 })
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Comms timeline GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { error } = await auth.supabase
      .from('accommodation_comms_timeline')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete comms entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comms timeline DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
