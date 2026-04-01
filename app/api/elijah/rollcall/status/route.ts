import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    // Get today's latest checkins per household
    const today = new Date().toISOString().split('T')[0]

    const { data: schedules } = await auth.supabase
      .from('elijah_rollcall_schedule')
      .select('id, time, section_id, grace_minutes')
      .eq('organization_id', auth.organizationId)

    const { data: checkins } = await auth.supabase
      .from('elijah_rollcall_checkin')
      .select(`
        id, status, created_at,
        household:elijah_household(id, address, unit_number, section_id),
        checked_in_by_member:elijah_member!checked_in_by(display_name)
      `)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })

    const { data: households } = await auth.supabase
      .from('elijah_household')
      .select('id, address, unit_number, section_id')
      .eq('organization_id', auth.organizationId)

    // Build status map: household_id -> latest status
    const statusMap: Record<string, { status: string; checked_at: string }> = {}
    for (const c of checkins || []) {
      const hid = (c.household as unknown as { id: string })?.id
      if (hid && !statusMap[hid]) {
        statusMap[hid] = { status: c.status, checked_at: c.created_at }
      }
    }

    // Mark unchecked households as 'pending'
    const results = (households || []).map(h => ({
      household_id: h.id,
      address: h.address,
      unit_number: h.unit_number,
      section_id: h.section_id,
      status: statusMap[h.id]?.status || 'pending',
      checked_at: statusMap[h.id]?.checked_at || null,
    }))

    const summary = {
      total: results.length,
      safe: results.filter(r => r.status === 'safe').length,
      help: results.filter(r => r.status === 'help').length,
      away: results.filter(r => r.status === 'away').length,
      pending: results.filter(r => r.status === 'pending').length,
      missed: results.filter(r => r.status === 'missed').length,
    }

    return NextResponse.json({ households: results, summary, schedules: schedules || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
