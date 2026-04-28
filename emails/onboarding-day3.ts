import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Day 3 Onboarding Email — You're live.
 * Non-transactional: includes unsubscribe link (POPI compliance).
 * Returns null on success, error string on failure.
 */
export async function sendOnboardingDay3(orgId: string): Promise<string | null> {
  const supa = createAdminClient()
  const { data: org } = await supa
    .from('organizations')
    .select('id, name, subdomain, owner_email, tier')
    .eq('id', orgId)
    .maybeSingle()

  if (!org) return 'org_not_found'

  const subdomain = org.subdomain as string
  const orgName = org.name as string
  const toEmail = org.owner_email as string | null
  if (!toEmail) return 'no_recipient_email'

  const dashboardUrl = `https://${subdomain}.draggonnb.co.za/dashboard`
  const unsubscribeUrl = `mailto:unsubscribe@draggonnb.co.za?subject=Unsubscribe+${orgId}`

  // Fetch active modules for the "what you've unlocked" section
  const { data: modules } = await supa
    .from('tenant_modules')
    .select('module_id, tenant_modules_module_registry:module_registry(display_name)')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  const moduleList = (modules ?? [])
    .map((m: unknown) => {
      const mod = m as { module_id: string; tenant_modules_module_registry?: { display_name?: string } | null }
      return mod.tenant_modules_module_registry?.display_name ?? mod.module_id
    })
    .join(', ')

  // Mark onboarding complete
  await supa
    .from('onboarding_progress')
    .update({ completed_at: new Date().toISOString() })
    .eq('organization_id', orgId)

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, sans-serif; color: #363940; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #6B1420;">Day 3: You're live!</h1>
      <p>Hi ${orgName},</p>
      <p>
        Three business days ago, you signed up for DraggonnB OS. Today, your platform is
        fully operational and running automations in the background.
      </p>
      <h2>What you've unlocked</h2>
      <ul>
        <li>AI content generation in your brand voice</li>
        <li>Automated lead capture and follow-up</li>
        ${moduleList ? `<li>Active modules: ${moduleList}</li>` : ''}
        <li>Real-time ops dashboard at <a href="${dashboardUrl}">${subdomain}.draggonnb.co.za</a></li>
      </ul>
      <h2>What's next?</h2>
      <p>
        Your account manager will check in with you next week. In the meantime,
        explore your dashboard and let the platform run.
      </p>
      <p>
        <a href="${dashboardUrl}"
           style="background: #6B1420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
          View Dashboard
        </a>
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

  const text = `Day 3: You're live!

Hi ${orgName},

Three business days ago, you signed up for DraggonnB OS. Today, your platform is fully operational and running automations in the background.

What you've unlocked:
- AI content generation in your brand voice
- Automated lead capture and follow-up
${moduleList ? `- Active modules: ${moduleList}` : ''}
- Real-time ops dashboard at ${dashboardUrl}

What's next?
Your account manager will check in with you next week. In the meantime, explore your dashboard and let the platform run.

Dashboard: ${dashboardUrl}

---
You're receiving this because you signed up for DraggonnB OS.
Unsubscribe: ${unsubscribeUrl}
Manage account: ${dashboardUrl}`

  const { error } = await resend.emails.send({
    from: 'noreply@draggonnb.online',
    to: toEmail,
    subject: `Day 3: You're live on DraggonnB OS — ${orgName}`,
    html,
    text,
  })

  return error ? error.message : null
}
