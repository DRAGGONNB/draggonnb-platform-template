// scripts/provisioning/steps/activate-trophy-module.ts
// SSO-11: Provisioning saga step 10 — activate Trophy module for a DraggonnB org.
// Idempotent, retryable, paused-on-failure (existing saga semantics).
// D6: auto-create Trophy `orgs` row at module-activation time, NOT at first SSO bridge.
//
// Trophy `orgs.type` enum confirmed from trophy-os/supabase/migrations/001_initial.sql:
//   CHECK (type IN ('game_farm', 'outfitter', 'taxidermist', 'processor', 'logistics'))
// Default: 'game_farm' — the primary operator type for DraggonnB-linked Trophy orgs.

import { createAdminClient } from '../../../lib/supabase/admin'
import type { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types'

export async function activateTrophyModule(job: ProvisioningJob): Promise<ProvisioningResult> {
  const admin = createAdminClient()
  const draggonnbOrgId = job.createdResources?.organizationId

  if (!draggonnbOrgId) {
    return {
      success: false,
      step: 'activate-trophy-module',
      error: 'No organizationId in job.createdResources',
    }
  }

  // Idempotency: if already linked, return success with existing data.
  // This makes the step safely retryable without duplicate row creation.
  const { data: existing } = await admin
    .from('organizations')
    .select('linked_trophy_org_id')
    .eq('id', draggonnbOrgId)
    .single()

  if (existing?.linked_trophy_org_id) {
    return {
      success: true,
      step: 'activate-trophy-module',
      data: { trophyOrgId: existing.linked_trophy_org_id },
    }
  }

  // Step 1: Create Trophy `orgs` row.
  // type='game_farm' is the default — callers can override via job.clientConfig
  // once a config key is defined for this. For now game_farm covers all DraggonnB-linked
  // hunting/safari operations.
  const trophyType = 'game_farm'
  const { data: trophyOrg, error: trophyOrgError } = await admin
    .from('orgs')
    .insert({
      name: job.clientName,
      slug: job.createdResources?.subdomain || job.clientId,
      type: trophyType,
      subscription_status: 'trial',
    })
    .select('id')
    .single()

  if (trophyOrgError || !trophyOrg) {
    return {
      success: false,
      step: 'activate-trophy-module',
      error: `Trophy orgs row insert failed: ${trophyOrgError?.message ?? 'unknown'}`,
    }
  }

  // Step 2: Insert cross_product_org_links row.
  // UNIQUE constraint on (draggonnb_org_id, trophy_org_id) will reject duplicates —
  // treat as no-op on duplicate (covered by idempotency check above, but belt-and-suspenders).
  const { error: linkError } = await admin
    .from('cross_product_org_links')
    .insert({
      draggonnb_org_id: draggonnbOrgId,
      trophy_org_id: trophyOrg.id,
      status: 'active',
    })

  if (linkError) {
    // Rollback the Trophy orgs row to keep state consistent.
    // A retry will start fresh from the idempotency check.
    await admin.from('orgs').delete().eq('id', trophyOrg.id)
    return {
      success: false,
      step: 'activate-trophy-module',
      error: `cross_product_org_links insert failed: ${linkError.message}`,
    }
  }

  // Step 3: Update organizations.linked_trophy_org_id (FK enforced as of plan 13-07 migration).
  const { error: updateError } = await admin
    .from('organizations')
    .update({ linked_trophy_org_id: trophyOrg.id })
    .eq('id', draggonnbOrgId)

  if (updateError) {
    // Rollback both prior writes so a retry starts clean.
    await admin.from('cross_product_org_links').delete().eq('trophy_org_id', trophyOrg.id)
    await admin.from('orgs').delete().eq('id', trophyOrg.id)
    return {
      success: false,
      step: 'activate-trophy-module',
      error: `organizations update failed: ${updateError.message}`,
    }
  }

  // Step 4: JSONB cache — tenant_modules.config.trophy.linked_org_id.
  // Best-effort: sidebar reads organizations.linked_trophy_org_id (the FK, injected via middleware)
  // as the authoritative source. The JSONB is a denormalized cache for module-config-aware code paths.
  // If this RPC call fails, do not roll back — the canonical state is already consistent.
  const { error: rpcError } = await admin.rpc('set_tenant_module_config_path', {
    p_organization_id: draggonnbOrgId,
    p_module_id: 'trophy',
    p_path: ['trophy', 'linked_org_id'],
    p_value: trophyOrg.id,
  })

  if (rpcError) {
    // Non-fatal: log for ops visibility, continue to success.
    // The sidebar uses the header-injected FK value, not the JSONB cache.
    console.error('[activate-trophy-module] JSONB cache update failed (non-fatal):', rpcError.message)
  }

  return {
    success: true,
    step: 'activate-trophy-module',
    data: { trophyOrgId: trophyOrg.id },
  }
}
