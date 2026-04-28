import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Day 2 Onboarding Email — Run your first action.
 * Non-transactional: includes unsubscribe link (POPI compliance).
 * Returns null on success, error string on failure.
 */
export async function sendOnboardingDay2(orgId: string): Promise<string | null> {
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
  const unsubscribeUrl = `mailto:unsubscribe@draggonnb.co.za?subject=Unsubscribe+${orgId}`

  // Get active modules to personalise the CTA
  const { data: modules } = await supa
    .from('tenant_modules')
    .select('module_id')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  const activeModuleIds = (modules ?? []).map((m: { module_id: string }) => m.module_id)
  const hasAccommodation = activeModuleIds.includes('accommodation')
  const hasCrm = activeModuleIds.includes('crm')

  const primaryAction = hasAccommodation
    ? { label: 'Create your first booking', url: `${dashboardUrl}/accommodation` }
    : hasCrm
    ? { label: 'Add your first lead', url: `${dashboardUrl}/crm` }
    : { label: 'Create your first campaign', url: `${dashboardUrl}/content` }

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, sans-serif; color: #363940; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #6B1420;">Day 2: Run your first action</h1>
      <p>Hi ${orgName},</p>
      <p>
        Today is about seeing DraggonnB OS work for you in real time.
        Your platform is configured and your brand voice is trained — now let's run your first action.
      </p>
      <p>
        <a href="${primaryAction.url}"
           style="background: #6B1420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
          ${primaryAction.label}
        </a>
      </p>
      <h2>What happens next?</h2>
      <ul>
        <li>AI generates content, quotes, or responses in your brand voice</li>
        <li>Automations trigger on the actions you define</li>
        <li>You review and approve — or let it run fully automated</li>
      </ul>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="color: #666; font-size: 12px;">
        You're receiving this because you signed up for DraggonnB OS.
        <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> |
        <a href="${dashboardUrl}" style="color: #666;">Manage account</a>
      </p>
    </body>
    </html>
  `

  const text = `Day 2: Run your first action

Hi ${orgName},

Today is about seeing DraggonnB OS work for you in real time. Your platform is configured and your brand voice is trained — now let's run your first action.

${primaryAction.label}: ${primaryAction.url}

What happens next?
- AI generates content, quotes, or responses in your brand voice
- Automations trigger on the actions you define
- You review and approve — or let it run fully automated

---
You're receiving this because you signed up for DraggonnB OS.
Unsubscribe: ${unsubscribeUrl}
Manage account: ${dashboardUrl}`

  const { error } = await resend.emails.send({
    from: 'noreply@draggonnb.online',
    to: toEmail,
    subject: `Day 2: Run your first action — ${orgName}`,
    html,
    text,
  })

  return error ? error.message : null
}
