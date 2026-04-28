import { NextRequest, NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { guardUsage } from '@/lib/usage/guard'
import { UsageCapExceededError } from '@/lib/usage/types'
import {
  sendEmail,
  renderTemplate,
  addEmailTracking,
  generateUnsubscribeUrl,
  generatePreferencesUrl,
  isValidEmail,
  sanitizeEmail,
  htmlToPlainText,
  isProviderConfigured,
} from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/email/send
 * Send a single email or batch of emails
 *
 * USAGE-13: replaced client_usage_metrics query + from('users') with:
 *   - getUserOrg() for org resolution
 *   - guardUsage({ metric: 'email_sends', qty: recipientCount }) BEFORE Resend call
 *
 * Body:
 * - to: string | string[] - Recipient email(s)
 * - subject: string - Email subject
 * - template_id?: string - Template to use (or provide html directly)
 * - html?: string - Direct HTML content
 * - variables?: object - Template variables
 * - from_name?: string - Sender name override
 */
export async function POST(request: NextRequest) {
  try {
    // Check if email provider is configured
    if (!isProviderConfigured()) {
      return NextResponse.json(
        { error: 'Email provider not configured. Set RESEND_API_KEY.' },
        { status: 503 }
      )
    }

    // Auth + org lookup
    const { data: userOrg, error: orgError } = await getUserOrg()
    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: orgError ?? 'org_lookup_failed' },
        { status: 401 }
      )
    }

    const organizationId = userOrg.organizationId

    // Parse request body (before guard so we know recipient count)
    const body = await request.json()
    const {
      to,
      subject,
      template_id,
      html: directHtml,
      variables = {},
      from_name,
    } = body

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email (to) is required' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    // Normalize recipients
    const recipients = Array.isArray(to) ? to : [to]
    const validRecipients = recipients.filter((email: string) => isValidEmail(email)).map((email: string) => sanitizeEmail(email))

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses provided' },
        { status: 400 }
      )
    }

    // Guard usage atomically BEFORE sending (advisory-lock-hardened via migration 28)
    // Amount = number of recipients to prevent partial-send quota drain
    try {
      await guardUsage({ orgId: organizationId, metric: 'email_sends', qty: validRecipients.length })
    } catch (err) {
      if (err instanceof UsageCapExceededError) {
        return NextResponse.json(
          {
            error: 'usage_cap_exceeded',
            metric: err.metric,
            used: err.currentUsage,
            limit: err.limit,
          },
          { status: 429 }
        )
      }
      console.error('guardUsage error (email/send):', err)
      return NextResponse.json({ error: 'Usage check failed' }, { status: 500 })
    }

    // Use RLS-scoped client for org-owned table queries (templates, unsubscribes, send records)
    const supabase = await createClient()

    // Check for unsubscribed recipients
    const { data: unsubscribes } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .eq('organization_id', organizationId)
      .in('email', validRecipients)
      .is('resubscribed_at', null)

    const unsubscribedEmails = new Set(unsubscribes?.map(u => u.email) || [])
    const activeRecipients = validRecipients.filter((email: string) => !unsubscribedEmails.has(email))

    if (activeRecipients.length === 0) {
      return NextResponse.json(
        { error: 'All recipients have unsubscribed', skipped: validRecipients },
        { status: 400 }
      )
    }

    // Get HTML content
    let htmlContent: string

    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('html_content, subject')
        .eq('id', template_id)
        .eq('organization_id', organizationId)
        .single()

      if (templateError || !template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      htmlContent = template.html_content
    } else if (directHtml) {
      htmlContent = directHtml
    } else {
      return NextResponse.json(
        { error: 'Either template_id or html content is required' },
        { status: 400 }
      )
    }

    // Process each recipient
    const results = []

    for (const recipientEmail of activeRecipients) {
      const allVariables = {
        ...variables,
        email: recipientEmail,
        unsubscribe_url: generateUnsubscribeUrl(organizationId, recipientEmail),
        preferences_url: generatePreferencesUrl(organizationId, recipientEmail),
        current_year: new Date().getFullYear().toString(),
      }

      let renderedHtml = renderTemplate(htmlContent, allVariables)
      const renderedSubject = renderTemplate(subject, allVariables)

      // Create email_sends record first to get ID for tracking
      const { data: sendRecord, error: sendError } = await supabase
        .from('email_sends')
        .insert({
          organization_id: organizationId,
          recipient_email: recipientEmail,
          subject: renderedSubject,
          from_email: process.env.EMAIL_FROM || 'noreply@draggonnb.online',
          from_name: from_name || process.env.EMAIL_FROM_NAME || 'DraggonnB',
          status: 'queued',
          provider: 'resend',
          metadata: { variables: allVariables },
        })
        .select('id')
        .single()

      if (sendError || !sendRecord) {
        console.error('Failed to create email send record:', sendError)
        results.push({
          email: recipientEmail,
          success: false,
          error: 'Failed to create send record',
        })
        continue
      }

      renderedHtml = addEmailTracking(renderedHtml, sendRecord.id)

      const textContent = htmlToPlainText(renderedHtml)

      const sendResult = await sendEmail({
        to: recipientEmail,
        subject: renderedSubject,
        html: renderedHtml,
        text: textContent,
        fromName: from_name,
      })

      if (sendResult.success) {
        await supabase
          .from('email_sends')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: sendResult.messageId,
          })
          .eq('id', sendRecord.id)
      } else {
        await supabase
          .from('email_sends')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: sendResult.error,
          })
          .eq('id', sendRecord.id)
      }

      results.push({
        email: recipientEmail,
        success: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.error,
      })
    }

    const allSuccess = results.every(r => r.success)
    const someSuccess = results.some(r => r.success)
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: someSuccess,
      results,
      summary: {
        total: validRecipients.length,
        sent: successCount,
        failed: results.filter(r => !r.success).length,
        skipped_unsubscribed: validRecipients.length - activeRecipients.length,
      },
    }, { status: allSuccess ? 200 : someSuccess ? 207 : 500 })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
