import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const { data: credits, error: creditsError } = await supabase
      .from('tenant_credits')
      .select(`
        id,
        dimension,
        credits_purchased,
        credits_remaining,
        source,
        purchased_at,
        expires_at,
        status,
        credit_packs (
          name,
          dimension
        )
      `)
      .eq('organization_id', userRecord.organization_id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('purchased_at', { ascending: true })

    if (creditsError) {
      console.error('[Billing/Credits] Query error:', creditsError)
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
    }

    return NextResponse.json({ credits: credits || [] })
  } catch (err) {
    console.error('[Billing/Credits] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
  }
}
