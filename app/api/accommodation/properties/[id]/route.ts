import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { data: property, error } = await auth.supabase
      .from('accommodation_properties')
      .select('*, accommodation_units(*, accommodation_rooms(*))')
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()

    // Remove fields that shouldn't be updated directly
    const { id, organization_id, created_by, created_at, accommodation_units, ...updateData } = body

    const { data: property, error } = await auth.supabase
      .from('accommodation_properties')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Failed to update property' }, { status: 500 })
    }

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Property PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { error } = await auth.supabase
      .from('accommodation_properties')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
