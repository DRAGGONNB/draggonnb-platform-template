// Phase 11: Campaign-specific Telegram alert helpers (Plan 11-11 Task 2).
// Three alert types: run failure (12a), brand-safety flag (12b), kill-switch activation (12c).
// All send to TELEGRAM_OPS_CHAT_ID using the platform bot token.
// Note: accommodation ops-bot.ts sendTelegramMessage is private; this module implements its own
// thin wrapper using the same Telegram Bot API pattern.

const TELEGRAM_API_BASE = 'https://api.telegram.org'

async function sendOpsMessage(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('[campaign-alerts] TELEGRAM_BOT_TOKEN or TELEGRAM_OPS_CHAT_ID not set — skipping alert')
    return
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { description?: string }
      console.error('[campaign-alerts] Telegram send error:', data.description)
    }
  } catch (err) {
    console.error('[campaign-alerts] Telegram send failed:', err)
  }
}

// ─── Alert 12a: Campaign Run Failure ─────────────────────────────────────────

export interface CampaignFailureAlertOpts {
  orgName: string
  orgId: string
  campaignName: string
  runId: string
  channel: string
  errorMessage: string
  failedCount: number
  totalCount: number
}

/**
 * Send a Telegram alert when a campaign run has items that failed to send.
 * Called by the execute route when items_failed > 0.
 */
export async function sendCampaignFailureAlert(opts: CampaignFailureAlertOpts): Promise<void> {
  const text = [
    `<b>[Campaign Run Failed]</b>`,
    ``,
    `Org: ${opts.orgName} (<code>${opts.orgId}</code>)`,
    `Campaign: ${opts.campaignName}`,
    `Run ID: <code>${opts.runId}</code>`,
    `Channel: ${opts.channel}`,
    `Error: ${opts.errorMessage}`,
    ``,
    `${opts.failedCount}/${opts.totalCount} items failed.`,
    `Review: /admin/clients/${opts.orgId}/campaigns/runs/${opts.runId}`,
  ].join('\n')

  await sendOpsMessage(text)
}

// ─── Alert 12b: Brand Safety Flag ────────────────────────────────────────────

export interface CampaignBrandSafetyAlertOpts {
  orgName: string
  campaignName: string
  channel: string
  flagType: string
  reason: string
  excerpt: string
}

/**
 * Send a Telegram alert when the brand safety agent flags a draft.
 * Called by the brand-safety check route (Plan 11-10). Exported here so 11-10 can import it.
 */
export async function sendCampaignBrandSafetyAlert(opts: CampaignBrandSafetyAlertOpts): Promise<void> {
  const text = [
    `<b>[Brand Safety Flag]</b>`,
    ``,
    `Org: ${opts.orgName}`,
    `Campaign: ${opts.campaignName}`,
    `Channel: ${opts.channel}`,
    `Flag type: ${opts.flagType}`,
    `Reason: ${opts.reason}`,
    `Excerpt: "<i>${opts.excerpt.slice(0, 200)}</i>"`,
    ``,
    `Draft is blocked from publishing. Tenant notified in-app.`,
  ].join('\n')

  await sendOpsMessage(text)
}

// ─── Alert 12c: Kill Switch Activation ───────────────────────────────────────

export interface KillSwitchAlertOpts {
  orgName: string
  orgId: string
  adminEmail: string
  reason: string
  cancelledCount: number
}

/**
 * Send a Telegram alert when a platform_admin activates the campaign kill switch for an org.
 * Called by POST /api/admin/campaigns/kill-switch.
 */
export async function sendKillSwitchAlert(opts: KillSwitchAlertOpts): Promise<void> {
  const text = [
    `<b>[Kill Switch Activated]</b>`,
    ``,
    `Org: ${opts.orgName} (<code>${opts.orgId}</code>)`,
    `Activated by: ${opts.adminEmail}`,
    `Reason: ${opts.reason}`,
    `Scheduled runs cancelled: ${opts.cancelledCount}`,
    ``,
    `To re-enable: /admin/clients/${opts.orgId}/campaigns/kill-switch`,
  ].join('\n')

  await sendOpsMessage(text)
}
