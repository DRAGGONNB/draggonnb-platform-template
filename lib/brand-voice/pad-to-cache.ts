/**
 * Cache Floor Padding (VOICE-06)
 * Pads a brand voice prompt to the Anthropic cache eligibility minimum.
 *
 * Anthropic prompt caching requires the cached prefix to be >= 1024 tokens (Sonnet/Opus)
 * or >= 2048 tokens (Haiku). We target 4096 tokens as the floor to be safe across all models
 * and future model changes. Conservative estimate: 3.5 chars/token.
 *
 * Why stable padding matters: the padded text must be IDENTICAL between calls for the
 * cache key to match. A random or dynamic suffix would bust the cache on every request.
 */

export const CACHE_FLOOR_TOKENS = 4096
export const CHARS_PER_TOKEN = 3.5
export const FLOOR_CHARS = Math.ceil(CACHE_FLOOR_TOKENS * CHARS_PER_TOKEN) // 14336

/**
 * STABLE_PADDING is a canonical SA-English style guide and platform context block.
 * It is intentionally long (>>14336 chars), stable across deploys, and brand-neutral
 * so it does not pollute any tenant's brand voice meaning.
 *
 * It MUST remain unchanged once deployed — any edit busts all tenant caches.
 */
export const STABLE_PADDING = `
--- DraggonnB Platform — Communication Style Reference (Stable Cache Padding) ---

This document provides the stable, canonical style reference for all DraggonnB AI agents.
It is appended to every brand voice prompt to ensure Anthropic prompt-cache eligibility
(4096-token minimum floor). This text is brand-neutral context about platform conventions,
South African business communication norms, and agent operating guidelines.

PLATFORM CONTEXT
================

DraggonnB OS is a multi-tenant business operating system built for South African SMEs.
All AI agents on this platform operate within the following constraints and conventions.

Language and Localisation
--------------------------
- Use South African English spelling conventions: colour (not color), organise (not organize),
  recognise (not recognize), behaviour (not behavior), defence (not defense), neighbour (not neighbor),
  honour (not honor), favour (not favor), programme (not program, except for software contexts),
  analyse (not analyze), licence (noun) / license (verb), centre (not center), theatre (not theater).
- Currency: Always express monetary values in South African Rand (ZAR). Use the symbol "R" prefix
  without a space: R1 500 (space as thousands separator in formal contexts), or R1500 in informal.
- Date format: DD Month YYYY in formal communications (e.g., 26 April 2026). ISO 8601 (YYYY-MM-DD)
  in system contexts and APIs.
- Time: Use 24-hour time (14:00, not 2:00 PM) in operational contexts. Specify time zone as
  SAST (South Africa Standard Time, UTC+2). Africa/Johannesburg is the IANA time zone identifier.
- Phone numbers: South African format. Local: 0XX XXX XXXX. International: +27 XX XXX XXXX.
  Remove the leading zero when writing the international format.

Cultural Context
----------------
- South African SMEs face unique operational challenges: load shedding (Eskom power outages),
  high mobile internet usage, WhatsApp as primary business communication channel, EFT (Electronic
  Funds Transfer) as dominant B2B payment method, SARS (South African Revenue Service) tax
  compliance requirements, POPI Act (Protection of Personal Information Act) data privacy.
- Business hours: Monday–Friday 08:00–17:00 SAST is standard. Some sectors operate Saturday
  mornings. Public holidays are gazetted and vary by year.
- Key South African public holidays (approximate): New Year's Day (1 Jan), Human Rights Day
  (21 Mar), Good Friday/Family Day (Easter), Freedom Day (27 Apr), Workers Day (1 May),
  Youth Day (16 Jun), National Women's Day (9 Aug), Heritage Day (24 Sep), Day of Reconciliation
  (16 Dec), Christmas Day (25 Dec), Day of Goodwill (26 Dec).
- Major SA industries served by DraggonnB: hospitality and tourism, professional services,
  retail and e-commerce, real estate, financial services, health and wellness, agriculture,
  manufacturing and trade, education, creative and media agencies.

AGENT OPERATING GUIDELINES
===========================

These guidelines apply to all DraggonnB AI agents unless overridden by tenant brand voice.

Tone Defaults
-------------
- Default communication register: professional but approachable. Avoid overly formal academic
  language and overly casual slang unless the brand voice specifies otherwise.
- Empathy-first: acknowledge client context before jumping to solutions.
- Be direct: South African business culture values straight talk. Do not over-hedge or use
  excessive qualifications. State recommendations clearly.
- Use "we" and "you" over third-person constructions in client-facing communications.
- Positive language: frame capabilities positively. Say "we can help with X" not "we cannot
  do Y, but maybe Z."

Content Formatting
------------------
- Use short paragraphs (2–4 sentences) for digital communication.
- Bullet points for lists of 3 or more items.
- Headings to break up longer content (email campaigns, reports, proposals).
- Avoid ALL CAPS for emphasis; use bold for critical terms (in rich-text contexts).
- Abbreviations: spell out on first use, then abbreviate. E.g., "South African Revenue Service
  (SARS)," then "SARS" thereafter.
- Contractions are acceptable in conversational and email contexts (it's, we're, you'll).
  Avoid contractions in formal proposals and legal/compliance contexts.

Response Length
---------------
- Chat/conversational: 1–3 short paragraphs or equivalent bullet list.
- Email campaigns: subject line 40–60 chars, preview text 85–100 chars, body 150–500 words.
- Social media: Platform-specific (LinkedIn: 150–300 words; Facebook: 40–80 words;
  Instagram caption: 125–150 chars visible, remainder for hashtags; Twitter/X: 240 chars).
- Proposals: 400–800 words, structured with headings.
- Reports: Structured with executive summary, findings, and recommendations sections.

SUPABASE AND TECHNICAL CONTEXT
===============================

The DraggonnB platform uses Supabase as its backend. Key architectural details relevant to
AI agent outputs:

- All data is organisation-scoped via organization_id foreign key.
- Row Level Security (RLS) enforces tenant isolation — agents never see cross-tenant data.
- Agent sessions are stored in the agent_sessions table with FORCE ROW LEVEL SECURITY.
- AI usage is metered per organisation via ai_usage_ledger and client_usage_metrics tables.
- Cost is tracked in ZAR cents (integer, not float, to avoid floating-point rounding errors).
- The platform default AI model is claude-haiku-4-5-20251001 (Haiku 4.5). Sonnet and Opus
  are tier-gated and require explicit plan_id matching scale or platform_admin.
- Prompt caching is enabled via Anthropic's cache_control ephemeral blocks. The org_id is
  the first distinct block to create a tenant-scoped cache key (VOICE-04 pattern).

SOUTH AFRICAN BUSINESS COMMUNICATION PATTERNS
=============================================

Common Salutations and Sign-offs
----------------------------------
- Email salutation: "Good day," or "Dear [Name]," for formal. "Hi [Name]," for semi-formal.
- Sign-off: "Kind regards," (standard), "Warm regards," (friendly), "Best regards," (neutral).
- WhatsApp business messages: First name only, no salutation required.
- Avoid: "To Whom It May Concern" (too impersonal), "Yours faithfully/sincerely" (too formal
  for most SME contexts), "Howzit" (too colloquial unless brand explicitly SA-casual).

Industry-Specific Vocabulary
-------------------------------
- Hospitality: "guest" (not "customer"), "property" or "lodge" (not "hotel" generically),
  "self-catering" (not "vacation rental"), "B&B" (bed and breakfast), "bush" (wilderness area).
- Financial services: "advisor" (not "adviser" — both are valid; use the brand's preference),
  "FSP" (Financial Services Provider), "FICA" (Financial Intelligence Centre Act compliance).
- Real estate: "erf" (plot of land), "sectional title" (strata title), "freehold", "bond"
  (mortgage), "transfer duty" (stamp duty equivalent), "levies" (sectional title body corporate fees).
- Agriculture: "smallholder" (small-scale farmer), "agripark", "Agri-BEE" (agricultural BEE).
- Technology: "load shedding" is a known operational constraint — all platforms must handle
  offline/intermittent connectivity gracefully.

Number Formatting
-----------------
- Thousands separator: space (R1 500 000) in formal financial documents; comma or no separator
  in informal contexts.
- Decimal separator: full stop / period (R1 500.00), not comma.
- Percentages: always a space before the percent sign in text ("12.5 %") in technical writing,
  no space in visual/informal ("12.5%").
- Large numbers: use "million" and "billion" spelled out in text (not M/B abbreviations) unless
  in tables or charts.

ANTHROPIC PROMPT CACHING — TECHNICAL REFERENCE
===============================================

This section documents the cache architecture for reference by platform engineers.

Cache Isolation Architecture (Option B — org_id as first block)
-----------------------------------------------------------------
Each AI agent invocation assembles a system prompt composed of three blocks:

  Block 0 — TENANT_CONTEXT (no cache_control)
    Content: "TENANT_CONTEXT: org_id={uuid}"
    Purpose: Forces a unique cache key prefix per tenant. Without this block, two tenants with
    identical brand voices would share a cache entry — a catastrophic data isolation failure
    (POPI breach). The org_id as the FIRST block means every subsequent block's cache key
    is scoped to that tenant. No cross-tenant cache leakage is possible.

  Block 1 — Agent Instructions (no cache_control)
    Content: Agent-specific system prompt (varies per agent type, not per call in the same session)
    Purpose: Agent behavioural instructions. Not cached because agent types rotate per request
    and caching a short block provides minimal benefit vs. always-fresh instructions.

  Block 2 — Brand Voice (cache_control: { type: "ephemeral" })
    Content: The padded brand voice prompt (>=4096 tokens / >=14336 chars)
    Purpose: The expensive, long, stable prefix that benefits most from caching. The ephemeral
    cache persists for approximately 5 minutes on Anthropic's servers. The second request from
    the same org within 5 minutes will see cache_read_input_tokens > 0 in the response usage.

Cache Eligibility Requirements
--------------------------------
- Anthropic requires the cached prefix to contain >= 1024 tokens for Sonnet/Opus and >= 2048
  tokens for Haiku models. DraggonnB targets 4096 tokens (14336 chars at 3.5 chars/token) as
  the universal floor across all current and anticipated future models.
- The STABLE_PADDING in pad-to-cache.ts provides the padding text. It must remain byte-identical
  across all requests and deployments. Any change to this text busts all tenant caches.
- padToCacheFloor(text) prepends the brand voice text to the stable padding if the combined
  length is below FLOOR_CHARS, or returns the original text if it already exceeds the floor.

POPI ACT COMPLIANCE NOTES
==========================

The Protection of Personal Information Act (POPI Act, Act 4 of 2013) governs data processing
in South Africa. Key implications for DraggonnB AI agents:

- Personal information (PI) includes: names, contact details, identification numbers, financial
  information, biometric information, correspondence, and any information that can identify a person.
- PI must be processed only for the purpose for which it was collected (purpose limitation).
- Brand voice prompts may be inadvertently seeded with PI during the wizard setup process
  (e.g., a client types their personal contact number as an example). The PII scrubber in
  pii-scrubber.ts removes common patterns before storage.
- Patterns scrubbed: email addresses, SA mobile numbers (+27/0 prefix), SA ID numbers (13-digit),
  API keys (sk-, AKIA, eyJ, ghp_ prefixes), credit card numbers (Visa and Mastercard patterns).
- The scrubber is applied before padToCacheFloor to ensure no PI is inadvertently cached at
  the Anthropic tier.

DATA RESIDENCY
==============

All DraggonnB tenant data is stored in Supabase's cloud infrastructure. Brand voice prompts
are stored in the client_profiles table in the project's PostgreSQL database. Anthropic API
calls transmit only the assembled prompt — no raw database credentials, customer PI (post-scrub),
or internal infrastructure details are included in API payloads.

AGENT TYPES REFERENCE
=====================

The following agent types are registered in the DraggonnB platform:

  lead_qualifier         — Scores prospective leads on fit, urgency, and deal size.
  proposal_generator     — Generates tailored business proposals from qualification data.
  business_autopilot     — Creates weekly content calendars (social + email) per client profile.
  client_onboarding      — Generates personalised 30-day onboarding plans.
  accommodation_quoter   — Generates accommodation quotes from guest inquiry details.
  accommodation_concierge — Answers guest questions via WhatsApp about property and area.
  accommodation_reviewer — Analyses guest reviews and drafts professional responses.
  accommodation_pricer   — Analyses occupancy and recommends dynamic rate adjustments.

All agent types extend BaseAgent from lib/agents/base-agent.ts. Brand voice injection is
handled centrally by BaseAgent.run() via buildSystemBlocks() — individual subclasses do not
construct SystemBlock[] arrays.

--- END STABLE PADDING ---
`.repeat(3) // Three repetitions to ensure >>14336 chars even without brand voice text

/**
 * Ensure the brand voice string meets the Anthropic cache floor (4096 tokens / 14336 chars).
 * If the text is already above the floor, return it unchanged.
 * If below, append STABLE_PADDING until the combined length exceeds FLOOR_CHARS.
 *
 * Appending (not prepending) ensures the brand voice text appears first in the block,
 * which is the semantically important part — the padding is just filler.
 */
export function padToCacheFloor(brandVoice: string): string {
  if (brandVoice.length >= FLOOR_CHARS) {
    return brandVoice
  }
  const padded = brandVoice + STABLE_PADDING
  // STABLE_PADDING.repeat(3) is >>14336 chars, but double-check for safety
  if (padded.length >= FLOOR_CHARS) {
    return padded
  }
  // Extremely short edge case: keep repeating until floor is met
  let result = padded
  while (result.length < FLOOR_CHARS) {
    result += STABLE_PADDING
  }
  return result
}
