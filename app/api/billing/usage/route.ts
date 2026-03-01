import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUsageSummary } from '@/lib/usage/check-limit'

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

    const usage = await getUsageSummary(userRecord.organization_id)
    return NextResponse.json({ usage })
  } catch (err) {
    console.error('[Billing/Usage] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
