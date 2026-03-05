import { NextResponse } from 'next/server'
import { getAccommodationAuth, isAuthError } from '@/lib/accommodation/api-helpers'
import { createDepositPolicySchema } from '@/lib/accommodation/schemas'

const updateDepositPolicySchema = createDepositPolicySchema.partial()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAccommodationAuth()
    if (isAuthError(auth)) return auth
    const { id } = await params

    const { data: policy, error } = await auth.supabase
      .from('accommodation_deposit_policies')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !policy) {
      return NextResponse.json({ error: 'Deposit policy not found' }, { status: 404 })
    }

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Deposit policy GET error:', error)
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
    const parsed = updateDepositPolicySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: policy, error } = await auth.supabase
      .from('accommodation_deposit_policies')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update deposit policy' }, { status: 500 })
    }

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Deposit policy PATCH error:', error)
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
      .from('accommodation_deposit_policies')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete deposit policy' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deposit policy DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
