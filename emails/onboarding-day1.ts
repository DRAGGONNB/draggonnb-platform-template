import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY!)

const KICKOFF_CALL_URL =
  process.env.KICKOFF_CALL_URL ?? 'https://cal.com/draggonnb-team'

/**
 * Day 1 Onboarding Email — Brand Voice Wizard.
 * Non-transactional: includes unsubscribe link (POPI compliance).
 * Returns null on success, error string on failure.
 */
export async function sendOnboardingDay1(orgId: string): Promise<string | null> {
  const supa = createAdminClient()
  const { data: org } = await supa
    .from('organizations')
    .select('id, name, subdomain, owner_email')
    .eq('id', orgId)
    .maybeSingle()

  if (!org) return 'org_not_found'

  const subdomain = org.subdomain as string
  const orgName = org.name as string
  const toEmail = org.owner_email as string | null
  if (!toEmail) return 'no_recipient_email'

  const dashboardUrl = `https://${subdomain}.draggonnb.co.za/dashboard`
  const brandWizardUrl = `https://${subdomain}.draggonnb.co.za/brand-voice`
  const unsubscribeUrl = `mailto:unsubscribe@draggonnb.co.za?subject=Unsubscribe+${orgId}`

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, sans-serif; color: #363940; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #6B1420;">Day 1: Set your brand voice</h1>
      <p>Hi ${orgName},</p>
      <p>
        Your AI engine needs to sound like <em>you</em> — not like a generic chatbot.
        The brand voice wizard takes 10 minutes and trains your platform on your tone,
        vocabulary, and style.
      </p>
      <p>
        <a href="${brandWizardUrl}"
           style="background: #6B1420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
          Open Brand Voice Wizard
        </a>
      </p>
      <h2>Also: Book your kickoff call</h2>
      <p>
        Our team will walk you through your first automation in 30 minutes.
        Pick a time that works for you:
      </p>
      <p>
        <a href="${KICKOFF_CALL_URL}" style="color: #6B1420;">Book Kickoff Call</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="color: #666; font-size: 12px;">
        You're receiving this because you signed up for DraggonnB OS.
        <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> |
        <a href="${dashboardUrl}" style="color: #666;">Manage account</a>
      </p>
    </body>
    </html>
  `

  const text = `Day 1: Set your brand voice

Hi ${orgName},

Your AI engine needs to sound like you — not like a generic chatbot. The brand voice wizard takes 10 minutes and trains your platform on your tone, vocabulary, and style.

Open Brand Voice Wizard: ${brandWizardUrl}

Also: Book your kickoff call
Our team will walk you through your first automation in 30 minutes.
Book Kickoff Call: ${KICKOFF_CALL_URL}

---
You're receiving this because you signed up for DraggonnB OS.
Unsubscribe: ${unsubscribeUrl}
Manage account: ${dashboardUrl}`

  const { error } = await resend.emails.send({
    from: 'noreply@draggonnb.online',
    to: toEmail,
    subject: `Day 1: Set your brand voice — ${orgName}`,
    html,
    text,
  })

  return error ? error.message : null
}
