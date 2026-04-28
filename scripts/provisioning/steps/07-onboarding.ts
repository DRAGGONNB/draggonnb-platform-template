import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';

/**
 * Phase 10 (ONBOARD-06): Step 7 is now a no-op stub.
 *
 * Previously this step sent 3 emails immediately (welcome + getting-started + first-automation).
 * This was incorrect — it violated the "3-day onboarding pipeline" promise and front-loaded
 * all communication rather than spacing it across business days.
 *
 * Replaced by:
 * - Step 10 (10-schedule-followups.ts): sends Day 0 welcome email + writes onboarding_progress timer
 * - N8N Day 1/2/3 cron workflows: poll onboarding_progress.timer_start_day and send timed emails
 *
 * Step 7 is kept in the orchestrator step list (position preserved) to avoid renumbering.
 * A WhatsApp welcome is still sent here if WHATSAPP_ACCESS_TOKEN is set — this is transactional
 * and immediate, not part of the 3-day drip.
 */
export async function sendOnboardingSequence(job: ProvisioningJob): Promise<ProvisioningResult> {
  console.log('  Step 7: Onboarding sequence deferred to N8N workflows + step 10 (Day 1/2/3 emails)');

  // WhatsApp welcome — transactional, send immediately if configured
  const ownerPhone = (job.clientConfig as unknown as Record<string, unknown>)?.ownerPhone as string | undefined;
  if (ownerPhone && process.env.WHATSAPP_ACCESS_TOKEN) {
    try {
      const { sendTextMessage } = await import('../../../lib/whatsapp/client');
      const subdomain = job.clientId;
      const dashboardUrl = `https://${subdomain}.draggonnb.co.za/dashboard`;
      await sendTextMessage(
        ownerPhone,
        `Welcome to DraggonnB OS, ${job.clientName}!\n\n` +
        `Your ${job.tier} plan is active and ready.\n\n` +
        `Dashboard: ${dashboardUrl}\n\n` +
        `Your 3-day onboarding guide starts tomorrow. Watch your inbox!`
      );
      console.log(`  Sent WhatsApp welcome to ${ownerPhone}`);
    } catch (waErr) {
      console.warn('  Warning: failed to send WhatsApp welcome (non-fatal):', waErr);
    }
  }

  return {
    success: true,
    step: 'onboarding-sequence',
    data: { onboardingEmailIds: 'deferred-to-n8n' },
  };
}
