import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { composeFollowupEmail, composeHotLeadPitchEmail } from '@/lib/crm/email-templates'

// ============================================================================
// VALIDATION
// ============================================================================

const ApproveActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('send_email') }),
  z.object({ type: z.literal('snooze_1d') }),
  z.object({ type: z.literal('decide'), choice: z.enum(['engage', 'archive', 'snooze']) }),
  z.object({ type: z.literal('engage_hot_lead') }),
])

const RequestSchema = z.object({
  itemId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.enum(['contact', 'deal', 'company']),
  action: ApproveActionSchema,
  organizationId: z.string().uuid(),
})

// ============================================================================
// STAGE PROGRESSION
// ============================================================================

const DEAL_STAGE_PROGRESSION: Record<string, string> = {
  lead: 'qualified',
  qualified: 'proposal',
  proposal: 'negotiation',
  negotiation: 'negotiation', // already at max active stage
}

// ============================================================================
// HELPERS
// ============================================================================

async function getContactEmail(supabase: ReturnType<typeof createAdminClient>, contactId: string): Promise<{ email: string | null; firstName: string | null; lastName: string | null }> {
  const { data } = await supabase
    .from('contacts')
    .select('email, first_name, last_name')
    .eq('id', contactId)
    .single()
  return { email: data?.email ?? null, firstName: data?.first_name ?? null, lastName: data?.last_name ?? null }
}

async function getBrandVoicePrompt(supabase: ReturnType<typeof createAdminClient>, orgId: string): Promise<string | null> {
  const { data } = await supabase
    .from('client_profiles')
    .select('brand_voice_prompt')
    .eq('organization_id', orgId)
    .maybeSingle()
  return data?.brand_voice_prompt ?? null
}

async function getOrgName(supabase: ReturnType<typeof createAdminClient>, orgId: string): Promise<string> {
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()
  return data?.name ?? 'Your team'
}

async function writeActivity(
  supabase: ReturnType<typeof createAdminClient>,
  opts: {
    orgId: string
    userId: string
    entityType: 'contact' | 'deal' | 'company'
    entityId: string
    actionType: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('crm_activities').insert({
    organization_id: opts.orgId,
    user_id: opts.userId,
    entity_type: opts.entityType,
    entity_id: opts.entityId,
    action_type: opts.actionType,
    source: 'easy_view',
    metadata: opts.metadata ?? {},
  })
}

// ============================================================================
// POST /api/crm/easy-view/approve
// ============================================================================

export async function POST(request: Request) {
  // Auth: use user client so session is verified
  const supabaseUser = await createClient()
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { entityId, entityType, action, organizationId } = parsed.data

  // Verify org membership (security check)
  const supabase = createAdminClient()
  const { data: membership } = await supabase
    .from('organization_users')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const orgName = await getOrgName(supabase, organizationId)
    const brandVoicePrompt = await getBrandVoicePrompt(supabase, organizationId)

    // -----------------------------------------------------------------------
    // BRANCH: send_email
    // -----------------------------------------------------------------------
    if (action.type === 'send_email') {
      if (entityType !== 'contact') {
        return Response.json({ error: 'send_email action requires entityType=contact' }, { status: 400 })
      }
      const { email, firstName, lastName } = await getContactEmail(supabase, entityId)
      if (!email) {
        return Response.json({ error: 'Contact has no email address' }, { status: 422 })
      }
      const template = await composeFollowupEmail({ orgName, contact: { firstName, lastName }, brandVoicePrompt })
      await sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text })
      // UX-05 audit: ONE crm_activities row per approve invocation
      await writeActivity(supabase, {
        orgId: organizationId,
        userId: user.id,
        entityType,
        entityId,
        actionType: 'email_sent',
        metadata: { subject: template.subject, brand_voice_used: Boolean(brandVoicePrompt) },
      })
      return Response.json({ success: true, action: 'email_sent' })
    }

    // -----------------------------------------------------------------------
    // BRANCH: snooze_1d
    // -----------------------------------------------------------------------
    if (action.type === 'snooze_1d') {
      const cardType = entityType === 'contact' ? 'followup' : 'hot_lead'
      await supabase.from('crm_action_dismissals').upsert({
        organization_id: organizationId,
        user_id: user.id,
        suggestion_card_type: cardType,
        entity_type: entityType,
        entity_id: entityId,
        dismissed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day
      }, { onConflict: 'user_id,suggestion_card_type,entity_id' })
      await writeActivity(supabase, {
        orgId: organizationId,
        userId: user.id,
        entityType,
        entityId,
        actionType: 'snoozed',
        metadata: { snooze_duration_hours: 24 },
      })
      return Response.json({ success: true, action: 'snoozed_1d' })
    }

    // -----------------------------------------------------------------------
    // BRANCH: decide (stale deal card)
    // -----------------------------------------------------------------------
    if (action.type === 'decide') {
      if (entityType !== 'deal') {
        return Response.json({ error: 'decide action requires entityType=deal' }, { status: 400 })
      }

      if (action.choice === 'engage') {
        // Re-engage: send follow-up email to the deal's linked contact (if any)
        const { data: deal } = await supabase.from('deals').select('contact_id, name').eq('id', entityId).single()
        if (deal?.contact_id) {
          const { email, firstName, lastName } = await getContactEmail(supabase, deal.contact_id)
          if (email) {
            const template = await composeFollowupEmail({ orgName, contact: { firstName, lastName }, brandVoicePrompt })
            await sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text })
          }
        }
        await writeActivity(supabase, {
          orgId: organizationId,
          userId: user.id,
          entityType,
          entityId,
          actionType: 'email_sent',
          metadata: { trigger: 'stale_deal_engage', brand_voice_used: Boolean(brandVoicePrompt) },
        })
        return Response.json({ success: true, action: 'engage_email_sent' })
      }

      if (action.choice === 'archive') {
        await supabase.from('deals').update({
          stage: 'lost',
          lost_reason: 'stale_archived_via_easy_view',
          updated_at: new Date().toISOString(),
        }).eq('id', entityId).eq('organization_id', organizationId)
        await writeActivity(supabase, {
          orgId: organizationId,
          userId: user.id,
          entityType,
          entityId,
          actionType: 'deal_archived',
          metadata: { reason: 'stale_archived_via_easy_view' },
        })
        return Response.json({ success: true, action: 'deal_archived' })
      }

      if (action.choice === 'snooze') {
        await supabase.from('crm_action_dismissals').upsert({
          organization_id: organizationId,
          user_id: user.id,
          suggestion_card_type: 'stale_deal',
          entity_type: entityType,
          entity_id: entityId,
          dismissed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days
        }, { onConflict: 'user_id,suggestion_card_type,entity_id' })
        await writeActivity(supabase, {
          orgId: organizationId,
          userId: user.id,
          entityType,
          entityId,
          actionType: 'snoozed',
          metadata: { snooze_duration_days: 7, trigger: 'stale_deal_snooze' },
        })
        return Response.json({ success: true, action: 'snoozed_7d' })
      }
    }

    // -----------------------------------------------------------------------
    // BRANCH: engage_hot_lead
    // 3 ops = 3 audit rows; not 1 — required for clean per-op reporting (UX-05)
    // -----------------------------------------------------------------------
    if (action.type === 'engage_hot_lead') {
      if (entityType !== 'deal') {
        return Response.json({ error: 'engage_hot_lead action requires entityType=deal' }, { status: 400 })
      }

      const { data: deal } = await supabase
        .from('deals')
        .select('contact_id, name, stage, assigned_to')
        .eq('id', entityId)
        .eq('organization_id', organizationId)
        .single()

      if (!deal) {
        return Response.json({ error: 'Deal not found' }, { status: 404 })
      }

      // Op 1: Send high-value pitch email
      let emailSent = false
      if (deal.contact_id) {
        const { email, firstName, lastName } = await getContactEmail(supabase, deal.contact_id)
        if (email) {
          const template = await composeHotLeadPitchEmail({
            orgName,
            contact: { firstName, lastName },
            dealName: deal.name,
            brandVoicePrompt,
          })
          await sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text })
          emailSent = true
        }
      }
      await writeActivity(supabase, {
        orgId: organizationId,
        userId: user.id,
        entityType,
        entityId,
        actionType: 'email_sent',
        metadata: { trigger: 'hot_lead_engage', email_sent: emailSent, brand_voice_used: Boolean(brandVoicePrompt) },
      })

      // Op 2: Advance deal to next stage
      const currentStage = deal.stage as string
      const nextStage = DEAL_STAGE_PROGRESSION[currentStage] ?? currentStage
      if (nextStage !== currentStage) {
        await supabase.from('deals').update({
          stage: nextStage,
          updated_at: new Date().toISOString(),
        }).eq('id', entityId).eq('organization_id', organizationId)
      }
      await writeActivity(supabase, {
        orgId: organizationId,
        userId: user.id,
        entityType,
        entityId,
        actionType: 'stage_moved',
        metadata: { from_stage: currentStage, to_stage: nextStage },
      })

      // Op 3: Create a 24h follow-up task (stored as crm_activities with task_created type)
      // Risk #6 escape: no separate crm_tasks table — tasks live in crm_activities metadata.
      const taskDueAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      await writeActivity(supabase, {
        orgId: organizationId,
        userId: user.id,
        entityType,
        entityId,
        actionType: 'task_created',
        metadata: {
          due_at: taskDueAt,
          assignee_id: deal.assigned_to ?? user.id,
          description: 'Call within 24h',
          trigger: 'hot_lead_engage',
        },
      })

      return Response.json({ success: true, action: 'hot_lead_engaged', stage_moved_to: nextStage })
    }

    return Response.json({ error: 'Unknown action type' }, { status: 400 })
  } catch (err) {
    console.error('[crm/easy-view/approve] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
