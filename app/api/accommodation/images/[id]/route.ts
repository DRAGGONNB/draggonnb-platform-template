import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { error } = await auth.supabase
      .from('accommodation_images')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Image DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
