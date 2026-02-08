import { getOpsClient } from '@/lib/ops/config'
import { sendTextMessage, sendInteractiveMessage } from './client'
import { LeadQualifierAgent } from '@/lib/agents/lead-qualifier'

// Conversation state machine stages
type ConversationState = 'started' | 'business_name' | 'website' | 'email' | 'issues' | 'industry' | 'complete'

// Questions for each state transition
const STATE_QUESTIONS: Record<ConversationState, string> = {
  started: "Hey there! Welcome to DraggonnB. I'm here to understand your business and see how we can help automate your growth.\n\nWhat's your business name?",
  business_name: "Great! Do you have a website? (If not, just type 'no')",
  website: "What's the best email address to reach you at?",
  email: "Now tell me — what are the biggest challenges or pain points in your business right now? (List as many as you like, separated by commas)",
  issues: "Last question — what industry are you in?",
  industry: "Thanks! I'm analyzing your business now...",
  complete: "Your information has been submitted! Our team will review it shortly and get back to you.",
}

// State transition order
const STATE_ORDER: ConversationState[] = ['started', 'business_name', 'website', 'email', 'issues', 'industry', 'complete']

function getNextState(current: ConversationState): ConversationState {
  const idx = STATE_ORDER.indexOf(current)
  if (idx === -1 || idx >= STATE_ORDER.length - 1) return 'complete'
  return STATE_ORDER[idx + 1]
}

export async function handleIncomingMessage(phone: string, messageText: string, messageId: string): Promise<void> {
  const supabase = getOpsClient()

  // Load or create ops_lead record
  let { data: lead } = await supabase
    .from('ops_leads')
    .select('*')
    .eq('phone_number', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lead) {
    // New lead — create record and send first question
    const { data: newLead, error } = await supabase
      .from('ops_leads')
      .insert({
        phone_number: phone,
        wa_message_id: messageId,
        conversation_state: 'started',
      })
      .select()
      .single()

    if (error || !newLead) {
      console.error('Failed to create ops_lead:', error)
      return
    }

    lead = newLead

    // Log activity
    await supabase.from('ops_activity_log').insert({
      event_type: 'whatsapp_intake_started',
      ops_lead_id: lead.id,
      details: { phone, message_id: messageId },
    })

    // Send welcome + first question
    await sendTextMessage(phone, STATE_QUESTIONS.started)
    return
  }

  // If already complete, send a message
  if (lead.conversation_state === 'complete') {
    await sendTextMessage(phone, "We've already received your information! Our team is reviewing it. We'll be in touch soon.")
    return
  }

  // Process answer for current state and advance
  const currentState = lead.conversation_state as ConversationState
  const nextState = getNextState(currentState)
  const updateData: Record<string, unknown> = {
    conversation_state: nextState,
    updated_at: new Date().toISOString(),
  }

  // Store the answer based on current state
  switch (currentState) {
    case 'started':
      updateData.business_name = messageText.trim()
      break
    case 'business_name':
      updateData.website = messageText.trim().toLowerCase() === 'no' ? null : messageText.trim()
      break
    case 'website':
      updateData.email = messageText.trim()
      break
    case 'email':
      updateData.business_issues = messageText.split(',').map((s: string) => s.trim()).filter(Boolean)
      break
    case 'issues':
      updateData.industry = messageText.trim()
      break
  }

  // Update the lead record
  await supabase
    .from('ops_leads')
    .update(updateData)
    .eq('id', lead.id)

  // Log activity
  await supabase.from('ops_activity_log').insert({
    event_type: 'whatsapp_message_received',
    ops_lead_id: lead.id,
    details: { state: currentState, next_state: nextState, message: messageText },
  })

  // If we just reached 'industry' (meaning they just answered the industry question),
  // the next state is 'complete' — trigger qualification
  if (nextState === 'complete') {
    await sendTextMessage(phone, STATE_QUESTIONS.industry)

    // Run LeadQualifierAgent
    try {
      const qualifier = new LeadQualifierAgent()
      const result = await qualifier.qualifyLead({
        id: lead.id,
        company_name: lead.business_name || messageText.trim(),
        email: lead.email || '',
        website: lead.website || undefined,
        industry: messageText.trim(),
        business_issues: lead.business_issues || [],
      })

      const qualResult = result.result as Record<string, unknown>

      await supabase
        .from('ops_leads')
        .update({
          qualification_result: qualResult,
          qualification_status: qualResult?.qualification_status === 'qualified' ? 'qualified' : 'pending',
          industry: messageText.trim(),
          conversation_state: 'complete',
        })
        .eq('id', lead.id)

      // Send Telegram notification for operator approval
      const { sendLeadNotification } = await import('@/lib/telegram/bot')
      await sendLeadNotification(lead.id, {
        business_name: lead.business_name || '',
        phone: phone,
        email: lead.email || '',
        website: lead.website || '',
        industry: messageText.trim(),
        issues: lead.business_issues || [],
      }, qualResult)

      await sendTextMessage(phone, STATE_QUESTIONS.complete)
    } catch (err) {
      console.error('Lead qualification error:', err)
      // Still mark as complete even if qualification fails
      await supabase
        .from('ops_leads')
        .update({ conversation_state: 'complete' })
        .eq('id', lead.id)
      await sendTextMessage(phone, "Thanks! We've received your info. Our team will review it and reach out soon.")
    }
  } else {
    // Send the next question
    await sendTextMessage(phone, STATE_QUESTIONS[nextState])
  }
}
