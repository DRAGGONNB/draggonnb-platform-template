import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Day 0 Welcome Email — transactional, sent immediately on provisioning step 10.
 * Exempt from POPI unsubscribe requirement (transactional, not marketing).
 * Returns null on success, error string on failure.
 */
export async function sendWelcomeDay0(orgId: string): Promise<string | null> {
  const supa = createAdminClient()
  const { data: org } = await supa
    .from('organizations')
    .select('id, name, subdomain')
    .eq('id', orgId)
    .maybeSingle()

  if (!org) return 'org_not_found'

  // Try to get admin email from organization_users
  const { data: adminUser } = await supa
    .from('organization_users')
    .select('users:auth.users(email)')
    .eq('organization_id', orgId)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()

  // Fall back to org owner_email if available, then to admin user email
  const { data: orgFull } = await supa
    .from('organizations')
    .select('id, name, subdomain, owner_email')
    .eq('id', orgId)
    .maybeSingle()

  const ownerEmail = orgFull?.owner_email as string | null | undefined
  const adminEmail = (adminUser as unknown as { users: { email: string } } | null)?.users?.email
  const toEmail = ownerEmail ?? adminEmail

  if (!toEmail) return 'no_recipient_email'

  const subdomain = org.subdomain as string
  const orgName = org.name as string
  const dashboardUrl = `https://${subdomain}.draggonnb.co.za/dashboard`

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Inter, sans-serif; color: #363940; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #6B1420;">Welcome to DraggonnB OS, ${orgName}!</h1>
      <p>Your platform is live. Three business days from today, you'll be running on autopilot.</p>
      <h2>Your 4-step start checklist</h2>
      <ol>
        <li>Log in to your dashboard</li>
        <li>Complete the brand voice wizard (10 min)</li>
        <li>Book your kickoff call</li>
        <li>Watch your first AI-generated content go live</li>
      </ol>
      <p>
        <a href="${dashboardUrl}"
           style="background: #6B1420; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
          Open Dashboard
        </a>
      </p>
      <p>Over the next 3 business days, we'll send you a short guide for each step. Watch your inbox.</p>
      <p style="color: #666; font-size: 12px; margin-top: 32px;">
        This is a transactional onboarding message. Manage your account at
        <a href="${dashboardUrl}">${dashboardUrl}</a>.
      </p>
    </body>
    </html>
  `

  const text = `Welcome to DraggonnB OS, ${orgName}!

Your platform is live. Three business days from today, you'll be running on autopilot.

Your 4-step start checklist:
1. Log in to your dashboard
2. Complete the brand voice wizard (10 min)
3. Book your kickoff call
4. Watch your first AI-generated content go live

Dashboard: ${dashboardUrl}

Over the next 3 business days, we'll send you a short guide for each step. Watch your inbox.

This is a transactional onboarding message.`

  const { error } = await resend.emails.send({
    from: 'noreply@draggonnb.online',
    to: toEmail,
    subject: `Welcome to ${orgName} on DraggonnB OS`,
    html,
    text,
  })

  return error ? error.message : null
}
