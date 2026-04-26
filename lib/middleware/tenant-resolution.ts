/**
 * Tenant resolution helper — central contract for "subdomain → organization".
 *
 * Phase 10 (10-07) added the `archived_at IS NULL` filter so soft-archived orgs
 * cannot be resolved. Used by the Edge middleware (`lib/supabase/middleware.ts`)
 * and any future server-side resolver that needs the same semantics.
 *
 * Contract:
 *   - Returns the active organization row matching the given subdomain.
 *   - NULL archived_at: org is live; resolves.
 *   - NON-NULL archived_at: org is soft-archived; returns null.
 *   - Subdomain not found: returns null.
 *
 * The Edge middleware inlines this same query (with the same filter) for cache
 * locality / cold-start cost; this module exposes the helper for unit tests
 * and any RSC/route-handler caller that needs to look up by subdomain.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvedTenantRow {
  id: string
  subdomain: string
  subscription_tier: string
}

export async function resolveTenantBySubdomain(
  supabase: SupabaseClient,
  subdomain: string,
): Promise<ResolvedTenantRow | null> {
  const { data } = await supabase
    .from('organizations')
    .select('id, subdomain, subscription_tier')
    .eq('subdomain', subdomain)
    .is('archived_at', null) // Phase 10: soft-archived orgs must not resolve
    .maybeSingle()

  return (data as ResolvedTenantRow | null) ?? null
}
