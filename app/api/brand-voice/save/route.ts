/**
 * POST /api/brand-voice/save
 * Validates wizard input, scrubs PII, pads to cache floor, and upserts brand_voice_prompt.
 *
 * Sequencing (order matters):
 *   1. assembleBrandVoicePrompt(input, businessName) — compose structured doc
 *   2. scrubPII(assembled)                           — strip SA PII patterns
 *   3. padToCacheFloor(scrubbed)                     — ensure >=4096 token floor
 *   4. upsert to client_profiles                     — store padded+scrubbed prompt
 *
 * VOICE-08 (re-run wizard): The upsert with onConflict=organization_id naturally
 * overwrites the prior brand_voice_prompt and bumps brand_voice_updated_at.
 * BaseAgent's per-instance brand voice cache is bounded by request lifetime,
 * so the next agent call in a new request loads the fresh voice automatically.
 */

import { NextRequest } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { BrandVoiceInputSchema } from '@/lib/brand-voice/wizard-questions'
import { assembleBrandVoicePrompt } from '@/lib/brand-voice/assemble-prompt'
import { scrubPII } from '@/lib/brand-voice/pii-scrubber'
import { padToCacheFloor } from '@/lib/brand-voice/pad-to-cache'

export async function POST(req: NextRequest) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = BrandVoiceInputSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 })
  }

  // Sequencing: assemble → scrub → pad. Order matters:
  // - Scrub the assembled doc to catch PII slipped into wizard answers.
  // - Pad AFTER scrub so the stable padding is never contaminated.
  const assembled = assembleBrandVoicePrompt(
    parsed.data,
    userOrg.organization?.name ?? 'Business',
  )
  const scrubbed = scrubPII(assembled)
  const padded = padToCacheFloor(scrubbed)

  const supa = createAdminClient()
  const { error: upsertError } = await supa
    .from('client_profiles')
    .upsert(
      {
        organization_id: userOrg.organizationId,
        brand_voice_prompt: padded,
        example_phrases: parsed.data.example_phrases,
        forbidden_topics: parsed.data.forbidden_topics,
        brand_voice_updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' },
    )

  if (upsertError) {
    return Response.json(
      { error: 'save_failed', detail: upsertError.message },
      { status: 500 },
    )
  }

  return Response.json({ ok: true, updated_at: new Date().toISOString() })
}
