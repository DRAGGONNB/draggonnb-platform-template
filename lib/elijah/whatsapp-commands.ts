import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Elijah WhatsApp Command Router
 * Extends the existing DraggonnB WhatsApp pipeline with security module commands.
 *
 * Commands: SAFE, HELP, AWAY, REPORT, FIRE, WATER STATUS, START PATROL, END PATROL
 */

interface WhatsAppMessage {
  from: string
  body: string
  wa_message_id: string
  timestamp: string
}

interface CommandResult {
  reply: string
  handled: boolean
}

/**
 * Route an inbound WhatsApp message to the appropriate Elijah handler.
 * Returns null if the message is not an Elijah command.
 */
export async function routeElijahCommand(
  supabase: SupabaseClient,
  orgId: string,
  message: WhatsAppMessage
): Promise<CommandResult | null> {
  const body = message.body.trim().toUpperCase()

  // Store inbound message
  await supabase.from('elijah_whatsapp_inbound').upsert({
    organization_id: orgId,
    from_phone: message.from,
    message_body: message.body,
    wa_message_id: message.wa_message_id,
    received_at: message.timestamp,
  }, { onConflict: 'wa_message_id', ignoreDuplicates: true })

  // Lookup member by phone
  const { data: member } = await supabase
    .from('elijah_member')
    .select('id, household_id, display_name')
    .eq('organization_id', orgId)
    .eq('phone', message.from)
    .single()

  if (!member) {
    return null // Not an Elijah member - don't handle
  }

  // Check for active session (multi-step commands)
  const { data: session } = await supabase
    .from('elijah_whatsapp_session')
    .select('*')
    .eq('organization_id', orgId)
    .eq('phone', message.from)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (session) {
    return handleSessionStep(supabase, orgId, member, session, message.body.trim())
  }

  // Route to command handler
  switch (body) {
    case 'SAFE':
    case 'HELP':
    case 'AWAY':
      return handleRollcallResponse(supabase, orgId, member, body.toLowerCase())

    case 'REPORT':
      return startReportSession(supabase, orgId, message.from)

    case 'FIRE':
      return startFireSession(supabase, orgId, message.from)

    case 'WATER STATUS':
      return handleWaterStatus(supabase, orgId)

    case 'START PATROL':
      return handlePatrolStart(supabase, orgId, member)

    case 'END PATROL':
      return handlePatrolEnd(supabase, orgId, member)

    default:
      return null // Not an Elijah command
  }
}

async function handleRollcallResponse(
  supabase: SupabaseClient,
  orgId: string,
  member: { id: string; household_id: string | null; display_name: string },
  status: string
): Promise<CommandResult> {
  if (!member.household_id) {
    return { reply: 'You are not linked to a household. Contact your community admin.', handled: true }
  }

  // Find today's active schedule
  const today = new Date().toISOString().split('T')[0]
  const { data: checkin } = await supabase
    .from('elijah_rollcall_checkin')
    .select('id, schedule_id')
    .eq('household_id', member.household_id)
    .gte('created_at', `${today}T00:00:00`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (checkin) {
    await supabase
      .from('elijah_rollcall_checkin')
      .update({ status, checked_in_by: member.id })
      .eq('id', checkin.id)
  } else {
    // No pending checkin - find any schedule and create one
    const { data: schedule } = await supabase
      .from('elijah_rollcall_schedule')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)
      .single()

    if (schedule) {
      await supabase.from('elijah_rollcall_checkin').insert({
        schedule_id: schedule.id,
        household_id: member.household_id,
        status,
        checked_in_by: member.id,
      })
    }
  }

  const replies: Record<string, string> = {
    safe: `Thank you ${member.display_name}. Your household is marked SAFE.`,
    help: `ALERT: ${member.display_name} has requested HELP. Dispatchers have been notified.`,
    away: `Noted, ${member.display_name}. Your household is marked AWAY.`,
  }

  // If HELP, auto-create incident
  if (status === 'help') {
    await supabase.from('elijah_incident').insert({
      organization_id: orgId,
      type: 'other',
      severity: 'high',
      status: 'open',
      description: `${member.display_name} requested help during roll call`,
      reported_by: member.id,
    })
  }

  return { reply: replies[status] || 'Response recorded.', handled: true }
}

async function startReportSession(
  supabase: SupabaseClient,
  orgId: string,
  phone: string
): Promise<CommandResult> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min TTL

  await supabase.from('elijah_whatsapp_session').insert({
    organization_id: orgId,
    phone,
    command: 'REPORT',
    step: 0,
    data: {},
    expires_at: expiresAt,
  })

  return {
    reply: 'INCIDENT REPORT\nWhat type of incident?\n1. Break-in\n2. Fire\n3. Medical\n4. Suspicious activity\n5. Noise\n6. Infrastructure\n7. Other\n\nReply with the number.',
    handled: true,
  }
}

async function startFireSession(
  supabase: SupabaseClient,
  orgId: string,
  phone: string
): Promise<CommandResult> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabase.from('elijah_whatsapp_session').insert({
    organization_id: orgId,
    phone,
    command: 'FIRE',
    step: 0,
    data: {},
    expires_at: expiresAt,
  })

  return {
    reply: 'FIRE REPORT\nPlease describe the location of the fire (street name, landmark, or GPS coordinates):',
    handled: true,
  }
}

async function handleSessionStep(
  supabase: SupabaseClient,
  orgId: string,
  member: { id: string; household_id: string | null; display_name: string },
  session: { id: string; command: string; step: number; data: Record<string, unknown> },
  input: string
): Promise<CommandResult> {
  if (input.toUpperCase() === 'CANCEL') {
    await supabase.from('elijah_whatsapp_session').delete().eq('id', session.id)
    return { reply: 'Report cancelled.', handled: true }
  }

  if (session.command === 'REPORT') {
    return handleReportStep(supabase, orgId, member, session, input)
  }

  if (session.command === 'FIRE') {
    return handleFireStep(supabase, orgId, member, session, input)
  }

  return { reply: 'Unknown session. Reply CANCEL to start over.', handled: true }
}

async function handleReportStep(
  supabase: SupabaseClient,
  orgId: string,
  member: { id: string; display_name: string },
  session: { id: string; step: number; data: Record<string, unknown> },
  input: string
): Promise<CommandResult> {
  const typeMap: Record<string, string> = {
    '1': 'break_in', '2': 'fire', '3': 'medical',
    '4': 'suspicious_activity', '5': 'noise', '6': 'infrastructure', '7': 'other',
  }

  if (session.step === 0) {
    const type = typeMap[input]
    if (!type) {
      return { reply: 'Please reply with a number (1-7).', handled: true }
    }

    // If fire, redirect to FIRE flow
    if (type === 'fire') {
      await supabase.from('elijah_whatsapp_session')
        .update({ command: 'FIRE', step: 0, data: {}, updated_at: new Date().toISOString() })
        .eq('id', session.id)
      return { reply: 'FIRE REPORT\nPlease describe the location of the fire:', handled: true }
    }

    await supabase.from('elijah_whatsapp_session')
      .update({ step: 1, data: { type }, updated_at: new Date().toISOString() })
      .eq('id', session.id)

    return { reply: 'Please describe the incident (what happened, where, etc.):', handled: true }
  }

  if (session.step === 1) {
    // Create incident
    const { error } = await supabase.from('elijah_incident').insert({
      organization_id: orgId,
      type: session.data.type as string,
      severity: 'medium',
      status: 'open',
      description: input,
      reported_by: member.id,
    })

    await supabase.from('elijah_whatsapp_session').delete().eq('id', session.id)

    if (error) {
      return { reply: 'Failed to create report. Please try again or contact your dispatcher.', handled: true }
    }

    return { reply: `Incident reported. Your dispatcher has been notified. Thank you, ${member.display_name}.`, handled: true }
  }

  return { reply: 'Unexpected step. Reply CANCEL to start over.', handled: true }
}

async function handleFireStep(
  supabase: SupabaseClient,
  orgId: string,
  member: { id: string; display_name: string },
  session: { id: string; step: number; data: Record<string, unknown> },
  input: string
): Promise<CommandResult> {
  if (session.step === 0) {
    await supabase.from('elijah_whatsapp_session')
      .update({ step: 1, data: { location_description: input }, updated_at: new Date().toISOString() })
      .eq('id', session.id)

    return { reply: 'Wind direction? (N, NE, E, SE, S, SW, W, NW, or UNKNOWN):', handled: true }
  }

  if (session.step === 1) {
    const wind = input.toUpperCase()

    // Create fire incident
    const { data: incident } = await supabase.from('elijah_incident').insert({
      organization_id: orgId,
      type: 'fire',
      severity: 'critical',
      status: 'open',
      description: `FIRE: ${session.data.location_description}. Wind: ${wind}. Reported via WhatsApp by ${member.display_name}.`,
      reported_by: member.id,
    }).select().single()

    if (incident) {
      await supabase.from('elijah_fire_incident').insert({
        incident_id: incident.id,
        fire_type: 'veld',
        wind_direction: wind === 'UNKNOWN' ? null : wind,
        status: 'reported',
      })
    }

    await supabase.from('elijah_whatsapp_session').delete().eq('id', session.id)

    return {
      reply: `FIRE REPORTED. All responder groups are being notified. Stay safe, ${member.display_name}. Dispatchers are coordinating response.`,
      handled: true,
    }
  }

  return { reply: 'Unexpected step. Reply CANCEL to start over.', handled: true }
}

async function handleWaterStatus(
  supabase: SupabaseClient,
  orgId: string
): Promise<CommandResult> {
  const { data: waterPoints } = await supabase
    .from('elijah_fire_water_point')
    .select('name, type, status, capacity_litres')
    .eq('organization_id', orgId)
    .order('name')
    .limit(10)

  if (!waterPoints || waterPoints.length === 0) {
    return { reply: 'No water points registered for your community.', handled: true }
  }

  const statusEmoji: Record<string, string> = {
    operational: 'OK', low: 'LOW', empty: 'EMPTY', maintenance: 'MAINT', unknown: '?',
  }

  const lines = waterPoints.map(wp =>
    `${wp.name} (${wp.type}) - ${statusEmoji[wp.status] || wp.status}${wp.capacity_litres ? ` ${wp.capacity_litres}L` : ''}`
  )

  return {
    reply: `WATER POINTS:\n${lines.join('\n')}`,
    handled: true,
  }
}

async function handlePatrolStart(
  supabase: SupabaseClient,
  orgId: string,
  member: { id: string; display_name: string }
): Promise<CommandResult> {
  // Find today's patrol assignment for this member
  const today = new Date().toISOString().split('T')[0]
  const { data: assignment } = await supabase
    .from('elijah_patrol_assignment')
    .select('patrol_id, patrol:elijah_patrol(id, status, scheduled_date)')
    .eq('member_id', member.id)
    .single()

  if (!assignment) {
    return { reply: 'You have no patrol assigned. Contact your dispatcher.', handled: true }
  }

  const patrol = Array.isArray(assignment.patrol) ? assignment.patrol[0] : assignment.patrol
  if (!patrol) {
    return { reply: 'Patrol not found. Contact your dispatcher.', handled: true }
  }

  // Create check-in
  await supabase.from('elijah_patrol_checkin').insert({
    patrol_id: patrol.id,
    member_id: member.id,
    checkin_type: 'in',
  })

  await supabase.from('elijah_patrol').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', patrol.id)

  return { reply: `Patrol started. Stay safe, ${member.display_name}. Reply END PATROL when done.`, handled: true }
}

async function handlePatrolEnd(
  supabase: SupabaseClient,
  orgId: string,
  member: { id: string; display_name: string }
): Promise<CommandResult> {
  // Find active patrol for this member
  const { data: checkins } = await supabase
    .from('elijah_patrol_checkin')
    .select('patrol_id')
    .eq('member_id', member.id)
    .eq('checkin_type', 'in')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!checkins || checkins.length === 0) {
    return { reply: 'No active patrol found. Use START PATROL first.', handled: true }
  }

  const patrolId = checkins[0].patrol_id

  await supabase.from('elijah_patrol_checkin').insert({
    patrol_id: patrolId,
    member_id: member.id,
    checkin_type: 'out',
  })

  return { reply: `Patrol ended. Thank you, ${member.display_name}.`, handled: true }
}
