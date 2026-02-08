import { NextResponse } from 'next/server'
import { getOpsClient } from '@/lib/ops/config'
import { sendMessage } from '@/lib/telegram/bot'
import { sendTextMessage } from '@/lib/whatsapp/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Handle callback queries (button presses)
    const callbackQuery = body.callback_query
    if (!callbackQuery) {
      return NextResponse.json({ status: 'ok' })
    }

    const data = callbackQuery.data as string
    const [action, leadId] = data.split(':')

    if (!action || !leadId) {
      return NextResponse.json({ status: 'ok' })
    }

    const supabase = getOpsClient()

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('ops_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      await answerCallback(callbackQuery.id, 'Lead not found')
      return NextResponse.json({ status: 'ok' })
    }

    // Prevent double-action
    if (['approved', 'provisioning', 'provisioned'].includes(lead.qualification_status)) {
      await answerCallback(callbackQuery.id, 'Already approved')
      return NextResponse.json({ status: 'ok' })
    }

    if (lead.qualification_status === 'rejected') {
      await answerCallback(callbackQuery.id, 'Already rejected')
      return NextResponse.json({ status: 'ok' })
    }

    if (action === 'approve') {
      // Update lead status
      await supabase
        .from('ops_leads')
        .update({ qualification_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', leadId)

      // Create provisioning job
      const { data: job } = await supabase
        .from('provisioning_jobs')
        .insert({
          ops_lead_id: leadId,
          status: 'pending',
          current_step: 'awaiting_start',
        })
        .select()
        .single()

      // Log activity
      await supabase.from('ops_activity_log').insert({
        event_type: 'lead_approved',
        ops_lead_id: leadId,
        provisioning_job_id: job?.id,
        details: { approved_by: 'telegram_operator' },
      })

      // Update lead to provisioning
      await supabase
        .from('ops_leads')
        .update({ qualification_status: 'provisioning' })
        .eq('id', leadId)

      // Trigger provisioning
      try {
        const { provisionClient } = await import('@/scripts/provisioning/orchestrator')
        const qualResult = lead.qualification_result as Record<string, unknown>
        const tier = (qualResult?.recommended_tier as string) || 'core'

        await supabase
          .from('provisioning_jobs')
          .update({ status: 'running', current_step: 'provisioning' })
          .eq('id', job?.id)

        const result = await provisionClient(
          leadId,
          lead.business_name || 'Unknown Business',
          lead.email || '',
          tier as 'core' | 'growth' | 'scale'
        )

        if (result.success) {
          await supabase
            .from('provisioning_jobs')
            .update({
              status: 'completed',
              current_step: 'done',
              created_resources: result.resources,
            })
            .eq('id', job?.id)

          await supabase
            .from('ops_leads')
            .update({ qualification_status: 'provisioned' })
            .eq('id', leadId)

          await sendMessage(`Provisioning complete for ${lead.business_name}`)

          if (lead.phone_number) {
            await sendTextMessage(
              lead.phone_number,
              `Great news! Your DraggonnB platform is being set up. You'll receive an email at ${lead.email} with login details shortly!`
            )
          }
        } else {
          await supabase
            .from('provisioning_jobs')
            .update({ status: 'failed', error_message: result.error })
            .eq('id', job?.id)

          await sendMessage(`Provisioning failed for ${lead.business_name}: ${result.error}`)
        }
      } catch (provError) {
        console.error('Provisioning trigger error:', provError)
        await sendMessage(`Provisioning error: ${provError instanceof Error ? provError.message : 'Unknown error'}`)
      }

      await answerCallback(callbackQuery.id, 'Approved! Provisioning started.')
    } else if (action === 'reject') {
      await supabase
        .from('ops_leads')
        .update({ qualification_status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', leadId)

      await supabase.from('ops_activity_log').insert({
        event_type: 'lead_rejected',
        ops_lead_id: leadId,
        details: { rejected_by: 'telegram_operator' },
      })

      if (lead.phone_number) {
        await sendTextMessage(
          lead.phone_number,
          "Thanks for your interest in DraggonnB! At this time, we don't have a solution that fits your needs perfectly. We'll keep your info on file and reach out if that changes."
        )
      }

      await sendMessage(`Lead ${lead.business_name} has been rejected.`)
      await answerCallback(callbackQuery.id, 'Lead rejected')
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

async function answerCallback(callbackQueryId: string, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return

  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  })
}
