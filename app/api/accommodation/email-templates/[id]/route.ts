import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createEmailTemplateSchema } from '@/lib/accommodation/schemas'

const updateEmailTemplateSchema = createEmailTemplateSchema.partial()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data: template, error } = await auth.supabase
      .from('accommodation_email_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Email template GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const body = await request.json()
    const parsed = updateEmailTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: template, error } = await auth.supabase
      .from('accommodation_email_templates')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update email template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Email template PATCH error:', error)
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
      .from('accommodation_email_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete email template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email template DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
