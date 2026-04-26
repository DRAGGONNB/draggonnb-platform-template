/**
 * System Block Builder (VOICE-03, VOICE-04, VOICE-06)
 *
 * Assembles the 3-block system prompt array for Anthropic API calls with
 * org-id-first cache isolation (Option B — Pitfall 4 mitigation).
 *
 * CACHE ARCHITECTURE:
 * - Block 0: TENANT_CONTEXT (org_id) — NO cache_control — forces tenant-scoped cache key
 * - Block 1: Agent instructions — NO cache_control — varies per agent type
 * - Block 2: Brand voice (padded) — cache_control: ephemeral — the cacheable prefix
 *
 * Why org_id as Block 0 without cache_control works:
 * Anthropic caches "up to and including the last block that has cache_control set."
 * By placing org_id FIRST (before any cached block), it becomes part of the cache key
 * for Block 2's ephemeral cache. Two tenants with identical brand voices will produce
 * different cache keys because their Block 0 texts differ. Cross-tenant cache leakage
 * is structurally impossible.
 *
 * CRITICAL: Do NOT add cache_control to Block 0 or Block 1. Adding it to Block 0 would
 * create a separate cache for just the org_id text, which is wasteful and provides no
 * benefit. The current design is the minimal correct implementation.
 */

export type SystemBlock = {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

/**
 * Build the 3-block (or 2-block) system prompt for a BaseAgent API call.
 *
 * @param orgId             The tenant's organization UUID. Used as the first distinct
 *                          block to scope the Anthropic cache key per tenant.
 * @param agentInstructions The agent-specific system prompt string (from this.config.systemPrompt).
 * @param brandVoicePrompt  The pre-padded brand voice prompt from client_profiles, or null
 *                          if the org has not yet configured a brand voice.
 *
 * @returns SystemBlock[] — 3 blocks if brand voice exists, 2 blocks if null.
 */
export function buildSystemBlocks(
  orgId: string,
  agentInstructions: string,
  brandVoicePrompt: string | null,
): SystemBlock[] {
  const blocks: SystemBlock[] = [
    // Block 0: org_id — DISTINCT first block forces tenant-scoped cache key (VOICE-04, Pitfall 4)
    // No cache_control — this block is cheap and must be part of every cache key
    { type: 'text', text: `TENANT_CONTEXT: org_id=${orgId}` },
    // Block 1: agent-specific instructions — no cache_control — varies per agent type
    { type: 'text', text: agentInstructions },
  ]

  if (brandVoicePrompt) {
    // Block 2: brand voice — cached at the ephemeral tier, padded to >=4096 token floor
    // This is the expensive prefix that benefits from caching.
    // cache_control on this block causes Anthropic to cache Blocks 0+1+2 as the prefix.
    blocks.push({
      type: 'text',
      text: brandVoicePrompt, // assumed already padded by save route (padToCacheFloor)
      cache_control: { type: 'ephemeral' },
    })
  }

  return blocks
}

/**
 * Extract the org_id from a system blocks array (inverse of Block 0 construction).
 * Used in tests to verify round-trip correctness of the cache key invariant.
 *
 * @returns The org_id string, or null if Block 0 is missing or malformed.
 */
export function extractOrgIdFromBlocks(blocks: SystemBlock[]): string | null {
  const first = blocks[0]
  if (!first || first.type !== 'text') return null
  const m = first.text.match(/^TENANT_CONTEXT: org_id=(.+)$/)
  return m?.[1] ?? null
}
