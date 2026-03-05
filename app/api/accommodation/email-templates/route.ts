import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createEmailTemplateSchema } from '@/lib/accommodation/schemas'

export async function GET(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const triggerType = searchParams.get('trigger_type')

    let query = auth.supabase
      .from('accommodation_email_templates')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('trigger_type', { ascending: true })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (triggerType) query = query.eq('trigger_type', triggerType)

    const { data: templates, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch email templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [], total: count || 0 })
  } catch (error) {
    console.error('Email templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth

    const body = await request.json()
    const parsed = createEmailTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: template, error } = await auth.supabase
      .from('accommodation_email_templates')
      .insert({
        organization_id: auth.organizationId,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create email template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Email templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
