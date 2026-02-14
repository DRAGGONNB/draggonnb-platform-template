import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entity_type and entity_id are required' }, { status: 400 })
    }

    const { data: images, error } = await auth.supabase
      .from('accommodation_images')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true })

    if (error) return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })

    return NextResponse.json({ images: images || [] })
  } catch (error) {
    console.error('Images GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const { entity_type, entity_id, url, alt_text, sort_order, is_primary } = body

    if (!entity_type || !entity_id || !url) {
      return NextResponse.json({ error: 'entity_type, entity_id, and url are required' }, { status: 400 })
    }

    // If setting as primary, unset other primary images for this entity
    if (is_primary) {
      await auth.supabase
        .from('accommodation_images')
        .update({ is_primary: false })
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('organization_id', auth.organizationId)
    }

    const { data: image, error } = await auth.supabase
      .from('accommodation_images')
      .insert({
        organization_id: auth.organizationId,
        entity_type,
        entity_id,
        url,
        alt_text: alt_text || null,
        sort_order: sort_order || 0,
        is_primary: is_primary || false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create image' }, { status: 500 })

    return NextResponse.json({ image }, { status: 201 })
  } catch (error) {
    console.error('Images POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
