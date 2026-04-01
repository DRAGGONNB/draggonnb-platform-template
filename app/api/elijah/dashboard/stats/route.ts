import { NextResponse } from 'next/server'
import { getElijahAuth, isAuthError } from '@/lib/elijah/api-helpers'

export async function GET() {
  try {
    const auth = await getElijahAuth()
    if (isAuthError(auth)) return auth

    const orgId = auth.organizationId

    // Parallel queries for dashboard stats
    const [incidentsRes, fireRes, rollcallRes, patrolsRes, escalationsRes] = await Promise.all([
      // Active incidents
      auth.supabase
        .from('elijah_incident')
        .select('id, type, severity, status, description, created_at, reporter:elijah_member!reported_by(display_name)')
        .eq('organization_id', orgId)
        .in('status', ['open', 'in_progress'])
        .order('severity')
        .order('created_at', { ascending: false })
        .limit(20),

      // Active fire incidents
      auth.supabase
        .from('elijah_fire_incident')
        .select(`
          id, fire_type, status, wind_direction, created_at,
          incident:elijah_incident!incident_id(id, description, severity, location)
        `)
        .in('status', ['reported', 'active', 'contained'])
        .limit(10),

      // Today's roll call status
      auth.supabase
        .from('elijah_rollcall_checkin')
        .select('status')
        .gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00`),

      // Active patrols
      auth.supabase
        .from('elijah_patrol')
        .select('id, status, scheduled_date, section:elijah_section(name), assignments:elijah_patrol_assignment(member:elijah_member(display_name))')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .limit(10),

      // Missed roll calls (households that haven't checked in)
      auth.supabase
        .from('elijah_household')
        .select('id, address, unit_number, section:elijah_section(name)')
        .eq('organization_id', orgId),
    ])

    const incidents = incidentsRes.data || []
    const fireIncidents = fireRes.data || []
    const todayCheckins = rollcallRes.data || []
    const activePatrols = patrolsRes.data || []
    const allHouseholds = escalationsRes.data || []

    // Calculate roll call summary
    const checkinStatuses = todayCheckins.map(c => c.status)
    const rollcallSummary = {
      safe: checkinStatuses.filter(s => s === 'safe').length,
      help: checkinStatuses.filter(s => s === 'help').length,
      away: checkinStatuses.filter(s => s === 'away').length,
      pending: allHouseholds.length - checkinStatuses.length,
      total: allHouseholds.length,
    }

    return NextResponse.json({
      active_incidents: incidents,
      active_incidents_count: incidents.length,
      active_fires: fireIncidents,
      active_fires_count: fireIncidents.length,
      rollcall: rollcallSummary,
      active_patrols: activePatrols,
      active_patrols_count: activePatrols.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
