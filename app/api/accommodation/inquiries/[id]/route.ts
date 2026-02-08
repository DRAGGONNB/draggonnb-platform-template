import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userData?.organization_id) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })

    const body = await request.json()

    const { data: inquiry, error } = await supabase
      .from('accommodation_inquiries')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error || !inquiry) return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 })

    return NextResponse.json({ inquiry })
  } catch (error) {
    console.error('Inquiry PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
