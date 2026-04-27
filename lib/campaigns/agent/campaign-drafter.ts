/**
 * CampaignDrafterAgent
 *
 * Generates a multi-channel campaign draft (5 social posts + 1 email + 1 SMS)
 * for a given campaign intent, using the tenant's brand voice automatically
 * via BaseAgent.run() → loadBrandVoice() → buildSystemBlocks().
 *
 * Brand voice injection: BaseAgent.run() calls loadBrandVoice(orgId) and
 * injects it via buildSystemBlocks() (lib/agents/base-agent.ts:263).
 * This agent does NOT manually fetch brand_voice_prompt.
 *
 * Model: Sonnet (default via BaseAgent) — larger creative output needs Sonnet
 * context window. Haiku is reserved for safety checks (BrandSafetyAgent).
 *
 * Registered AgentType: 'campaign_drafter' (lib/agents/types.ts — Plan 11-02)
 */

import { BaseAgent } from '@/lib/agents/base-agent'
import type { AgentConfig } from '@/lib/agents/types'

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type CampaignChannel = 'email' | 'sms' | 'facebook' | 'instagram' | 'linkedin'

export interface CampaignDraftItem {
  channel: CampaignChannel
  /** Subject line — required for email channel */
  subject?: string
  bodyText: string
  /** HTML version — email channel only */
  bodyHtml?: string
  /** Optional creative direction cues (image ideas, visual suggestions) */
  mediaSuggestions?: string[]
}

export interface CampaignDraftResult {
  posts: CampaignDraftItem[]
}

// ============================================================================
// AGENT CONFIG
// ============================================================================

const CONFIG: AgentConfig = {
  agentType: 'campaign_drafter',
  systemPrompt: `You are a marketing campaign drafter for a small business in South Africa.

Given an intent (e.g. "promote our Sunday brunch special"), output a complete multi-channel campaign:
- 5 social posts (1 each for: facebook, instagram, linkedin, plus 2 alternates the user can choose from for facebook/instagram)
- 1 email (with subject line, ~250 words)
- 1 SMS (<=160 characters)

Channel guidelines:
- Facebook / Instagram: 150-300 words, conversational, emoji-light, end with a soft CTA
- LinkedIn: 200-300 words, more professional tone, emphasize value/outcome
- Email: subject 5-9 words, body ~250 words with greeting, value proposition, offer, and CTA
- SMS: <=160 chars, no emojis, clear CTA, include "Reply STOP to opt out"

Output ONLY valid JSON matching this schema (no markdown fences, no prose before or after):
{
  "posts": [
    {
      "channel": "facebook|instagram|linkedin|email|sms",
      "subject": "string (email only, omit for other channels)",
      "bodyText": "string",
      "bodyHtml": "string (email only, plain HTML fragment, omit for other channels)",
      "mediaSuggestions": ["string", "string"]
    }
  ]
}

The brand voice and tone guidelines for this business are provided in a separate system block.
Follow them strictly — they override these defaults.`,
  // Sonnet default via BaseAgent (drafter needs larger context for 7 posts + HTML)
  maxTokens: 4096,
  temperature: 0.7,
}

// ============================================================================
// AGENT
// ============================================================================

export class CampaignDrafterAgent extends BaseAgent {
  constructor() {
    super(CONFIG)
  }

  /**
   * Parse Sonnet response into CampaignDraftResult.
   *
   * Strips markdown code fences (Sonnet sometimes wraps JSON in ```json...```).
   * Validates that posts array exists and is non-empty.
   * Throws on parse failure — BaseAgent catches and stores raw response for diagnostics.
   */
  protected parseResponse(response: string): CampaignDraftResult {
    // Strip markdown fences (```json ... ``` or ``` ... ```)
    const cleaned = response.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch (err) {
      throw new Error(
        `CampaignDrafterAgent: failed to parse JSON response. Raw (first 200 chars): ${cleaned.slice(0, 200)}`
      )
    }

    const result = parsed as CampaignDraftResult
    if (!result.posts || !Array.isArray(result.posts)) {
      throw new Error(
        'CampaignDrafterAgent: response missing "posts" array. Got: ' +
          JSON.stringify(Object.keys(result))
      )
    }

    return result
  }
}
