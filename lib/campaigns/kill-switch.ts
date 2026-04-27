// Phase 11: Campaign kill switch helpers (CAMP-06).
// Kill switch state lives in tenant_modules.config.campaigns.kill_switch_active JSONB key — no new column.
// Admin API route: POST /api/admin/campaigns/kill-switch
// Admin UI: /admin/clients/[id]/campaigns/kill-switch

import type { SupabaseClient } from '@supabase/supabase-js'

type CampaignModuleConfig = {
  campaigns?: {
    kill_switch_active?: boolean
    kill_switch_activated_at?: string
    kill_switch_deactivated_at?: string
    kill_switch_reason?: string
    kill_switch_admin?: string
  }
}

/**
 * Read the current kill switch state for an org's campaigns module.
 * Returns true if kill_switch_active === true.
 */
export async function isKillSwitchActive(supabase: SupabaseClient, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')
    .maybeSingle()

  return !!(data?.config as CampaignModuleConfig | null)?.campaigns?.kill_switch_active
}

/**
 * Get the full kill switch status object for the admin UI.
 */
export async function getKillSwitchStatus(
  supabase: SupabaseClient,
  orgId: string
): Promise<{
  active: boolean
  activatedAt: string | null
  deactivatedAt: string | null
  reason: string | null
  admin: string | null
}> {
  const { data } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')
    .maybeSingle()

  const cfg = (data?.config as CampaignModuleConfig | null)?.campaigns ?? {}
  return {
    active: !!(cfg.kill_switch_active),
    activatedAt: cfg.kill_switch_activated_at ?? null,
    deactivatedAt: cfg.kill_switch_deactivated_at ?? null,
    reason: cfg.kill_switch_reason ?? null,
    admin: cfg.kill_switch_admin ?? null,
  }
}

/**
 * Activate or deactivate the kill switch for an org.
 * When activating: merges kill switch fields into the existing JSONB config (does NOT blow away other keys),
 * then calls cancel_org_campaign_runs() RPC to unschedule pg_cron jobs + mark runs as 'killed'.
 * When deactivating: clears the active flag (existing scheduled runs do NOT auto-rebuild — operator must manually reschedule).
 *
 * Returns { cancelled: number } — number of runs cancelled (0 when deactivating).
 */
export async function setKillSwitch(
  supabase: SupabaseClient,
  orgId: string,
  active: boolean,
  reason: string,
  adminEmail: string
): Promise<{ cancelled: number }> {
  // Load existing config to avoid overwriting unrelated keys
  const { data: mod } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')
    .maybeSingle()

  const existingConfig = (mod?.config as CampaignModuleConfig | null) ?? {}
  const existingCampaigns = existingConfig.campaigns ?? {}

  const updatedCampaigns = active
    ? {
        ...existingCampaigns,
        kill_switch_active: true,
        kill_switch_activated_at: new Date().toISOString(),
        kill_switch_reason: reason,
        kill_switch_admin: adminEmail,
        // Clear any previous deactivation timestamp
        kill_switch_deactivated_at: undefined,
      }
    : {
        ...existingCampaigns,
        kill_switch_active: false,
        kill_switch_deactivated_at: new Date().toISOString(),
      }

  const newConfig: CampaignModuleConfig = {
    ...existingConfig,
    campaigns: updatedCampaigns,
  }

  const { error: updateError } = await supabase
    .from('tenant_modules')
    .update({ config: newConfig })
    .eq('organization_id', orgId)
    .eq('module_id', 'campaigns')

  if (updateError) {
    throw new Error(`Failed to update kill switch config: ${updateError.message}`)
  }

  if (active) {
    // Cancel all pending/executing runs via SECURITY DEFINER RPC (migration 49)
    const { data: cancelled, error: rpcError } = await supabase.rpc('cancel_org_campaign_runs', {
      p_org_id: orgId,
    })
    if (rpcError) {
      console.error('[kill-switch] cancel_org_campaign_runs RPC error:', rpcError.message)
      // Non-fatal: config is already set, runs may still get cancelled by status check in execute route
    }
    return { cancelled: (cancelled as number) ?? 0 }
  }

  return { cancelled: 0 }
}
