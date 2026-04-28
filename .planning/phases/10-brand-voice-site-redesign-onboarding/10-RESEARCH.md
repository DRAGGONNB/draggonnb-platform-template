# Phase 10: Brand Voice + Site Redesign + 3-Day Onboarding — Research

**Researched:** 2026-04-26
**Domain:** Multi-tenant SaaS — Anthropic prompt caching, brand voice capture, N8N onboarding sequencing, provisioning saga state machine, Next.js landing page redesign
**Overall Confidence:** HIGH (codebase verified directly; Anthropic caching mechanics confirmed via prior research); MEDIUM on URL-scraping library choice (WebSearch-sourced, no Context7 verification)

---

## Summary

Phase 10 closes the revenue loop: brand voice injected into every agent, a public site worth landing on, and an automated 3-day onboarding sequence. The exit milestone is "first paying client goes live."

The Phase 09 foundation is clean. Zero paying orgs, 9 migrations live, BaseAgent already supports `SystemBlock[]` (the `normalizeSystem()` helper is in place), `guardUsage()` in `lib/usage/guard.ts` is the correct enforcement path, and `compose()` + `getAddonsCatalog()` are the billing primitives. Phase 10 builds directly on these without re-implementing anything.

The most dangerous work in Phase 10 is the provisioning saga rewrite (ONBOARD-07) and the USAGE-13 cleanup. Both are latent defects in production code today (silent no-ops) that must be fixed before the first client is provisioned. Everything else (brand voice wizard, site redesign, cost monitoring UI) is net-new surface area with low blast radius.

**Primary recommendation:** Sequence the phase as: (1) USAGE-13 cleanup + provisioning saga PAUSE model first (fixes latent defects before first client), (2) brand voice DB + agent injection (enabler for onboarding), (3) onboarding pipeline (N8N sequences + `onboarding_progress` table), (4) site redesign + pricing page (public-facing, needs brand voice done first for "voice capture" CTA), (5) cost monitoring UI (admin-only, lower urgency).

---

## Standard Stack

### Core (already installed — leveraged in new ways)

| Library | Version | Purpose | Phase 10 use |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.73.0 | Anthropic API | `cache_control: ephemeral` system blocks for brand voice. Already supports this — no upgrade needed. |
| `resend` | ^3.1.0 | Email delivery | 4 onboarding emails (Day 0–3); use `scheduledAt` for Day 1–3 delays |
| `zod` | ^3.22.0 | Schema validation | `BrandVoiceInputSchema` (wizard form), `OnboardingProgressSchema` |
| `date-fns-tz` | ^3.x | Timezone-aware dates | Monthly reset timestamps in `Africa/Johannesburg`; "3 business days" weekend calc |
| `@tanstack/react-table` | ^8.21.x | Headless tables | Cost monitoring page (`/admin/cost-monitoring`) |
| `recharts` | ^2.12.0 | Charts | 30-day cost trend in cost monitoring |
| `@supabase/supabase-js` | ^2.39.0 | DB client | `onboarding_progress` table, brand voice columns, org soft-archive |

### New Installs Needed

| Library | Purpose | Install command |
|---------|---------|-----------------|
| `cheerio` | URL scraper for brand voice wizard — parses HTML from client website, extracts meta description, h1, about text. Runs server-side only. | `npm install cheerio` |

**Why cheerio over alternatives:** Puppeteer is too heavy for Vercel serverless (binary size). `@mozilla/readability` is good for article extraction but overkill for grabbing meta/h1/hero text. Cheerio is 120KB, zero-native-deps, works in any serverless runtime. (MEDIUM confidence — WebSearch sourced; no alternative available in Context7 for this specific use case.)

### What We Explicitly Do NOT Add

| Do NOT add | Reason |
|------------|--------|
| Puppeteer/Playwright for URL scraping | Binary size incompatible with Vercel serverless |
| React Email (`@react-email/components`) | Resend already accepts raw HTML strings; adding a full email component library adds build complexity without payoff for 4 emails |
| Redis/Upstash for usage caps | `guardUsage()` uses PostgreSQL advisory locks (migration 28) — already the correct path |
| Separate `onboarding_emails` table | Resend manages delivery state; `onboarding_progress` table tracks our side of the state |

---

## Architecture Patterns

### Recommended Project Structure (Phase 10 additions)

```
lib/
├── brand-voice/
│   ├── scraper.ts          # URL → raw text (cheerio)
│   ├── pii-scrubber.ts     # strip emails/phones/IDs before storage
│   ├── wizard-questions.ts  # 5 question definitions + validation
│   └── pad-to-cache.ts     # ensure >=4096-token floor
├── provisioning/
│   └── saga-state.ts       # PAUSE-with-resume state machine (replaces rollback.ts cascade)
├── usage/
│   └── guard.ts            # already exists — Phase 10 migrates 7 callsites to use this

app/
├── (dashboard)/
│   ├── settings/brand-voice/
│   │   └── page.tsx        # wizard UI (multi-step, client component)
│   ├── admin/cost-monitoring/
│   │   └── page.tsx        # platform_admin only
│   └── _components/
│       ├── usage-warning-banner.tsx    # USAGE-03
│       └── usage-cap-modal.tsx         # USAGE-04
└── api/
    ├── brand-voice/
    │   ├── scrape/route.ts     # POST: URL → scraped text
    │   ├── save/route.ts       # POST: wizard result → DB
    │   └── route.ts            # GET: fetch current brand voice
    ├── admin/
    │   └── cost-monitoring/route.ts    # GET: daily_cost_rollup + subscription_composition
    └── ops/
        └── onboarding-progress/route.ts # GET/PATCH: saga progress

supabase/migrations/
├── 31_brand_voice_columns.sql         # ALTER client_profiles
├── 32_onboarding_progress.sql         # new table
├── 33_org_soft_archive.sql             # ADD archived_at to organizations
├── 34_subscription_history.sql         # missing table referenced in subscriptions.ts
├── 35_drop_legacy_usage.sql            # DROP client_usage_metrics after USAGE-13 cleanup
```

### Pattern 1: Brand Voice as SystemBlock Array

**What:** Brand voice is injected as the second system block (after org_id block) with `cache_control: ephemeral`. The `normalizeSystem()` helper in `base-agent.ts` already handles `SystemBlock[]` — agents just need to pass the voice array instead of a string.

**When to use:** Every agent call where `organizationId` is present and `client_profiles.brand_voice_prompt` is non-null.

**BaseAgent already has this wired (line 250-260 of base-agent.ts):**
```typescript
// Source: lib/agents/base-agent.ts (Phase 09 Phase 10 prep — normalizeSystem already exists)
const systemBlocks = normalizeSystem(
  this.config.systemPrompt as string | SystemBlock[] | undefined
)
// Phase 10: agents construct systemPrompt as SystemBlock[] with org_id + voice blocks
```

**Phase 10 injection pattern (new helper):**
```typescript
// lib/brand-voice/build-system-blocks.ts
export function buildSystemBlocks(
  orgId: string,
  agentInstructions: string,
  brandVoicePrompt: string | null,
): SystemBlock[] {
  // Block 0: org_id — forces tenant-scoped cache key (VOICE-04)
  const blocks: SystemBlock[] = [
    { type: 'text', text: `TENANT_CONTEXT: org_id=${orgId}` },
  ]
  // Block 1: agent instructions (no cache — changes per agent type)
  blocks.push({ type: 'text', text: agentInstructions })
  // Block 2: brand voice — cached block (VOICE-03, VOICE-04, VOICE-06)
  if (brandVoicePrompt) {
    const padded = padToCacheFloor(brandVoicePrompt)  // ensures >= 4096 tokens
    blocks.push({
      type: 'text',
      text: padded,
      cache_control: { type: 'ephemeral' },
    })
  }
  return blocks
}
```

### Pattern 2: Anthropic Cache Key Isolation (VOICE-04)

**What:** `org_id` as distinct first text block forces a unique cache prefix per tenant. Even if two tenants have identical brand voice text, their cache entries are separate because the first block differs.

**The 4,096-token floor:** Haiku 4.5 requires the cached block to be at least 4,096 tokens. Brand voice from the wizard will likely be 800-2,000 tokens. Padding strategy: append stable module-context text (feature descriptions, SA English style guide, formatting rules) to reach the floor. DO NOT pad with tenant-specific data — stable content maximizes cache hit rate.

**Cache TTL:** 5 minutes (ephemeral). Campaign Studio and bulk generation within a session will benefit. Periodic agent calls (day-old interval) will each pay a 1.25x write cost. This is acceptable — the floor guarantee prevents the 10x scenario.

**Confidence:** HIGH — verified from Phase 09 research + PITFALLS.md Pitfall 4 and 16.

### Pattern 3: Provisioning Saga PAUSE Model (ONBOARD-07)

**What:** Replace cascade-delete rollback with a PAUSE-with-resume model. The existing `provisioning_jobs` table (migration 05, already in DB) has `status`, `current_step`, `steps_completed`, and `created_resources` JSONB columns — this is the state shape we need.

**Current broken behavior (rollback.ts):** `DELETE FROM organizations WHERE id = ...` with CASCADE. This destroys everything if N8N step fails (Pitfall 10).

**New behavior:** On step failure, set `provisioning_jobs.status = 'paused'` and `error_message` = step error. Send Telegram alert to `TELEGRAM_OPS_CHAT_ID`. Org stays alive (usable after steps 1-4). Operator fixes the root cause and calls a resume endpoint.

**Existing `provisioning_jobs` schema fits Phase 10 needs:**
```sql
-- Already exists in migration 05:
-- status: 'pending'|'running'|'completed'|'failed'|'rolled_back'
-- Phase 10: ADD 'paused' to the CHECK constraint
ALTER TABLE provisioning_jobs
  DROP CONSTRAINT IF EXISTS provisioning_jobs_status_check;
ALTER TABLE provisioning_jobs
  ADD CONSTRAINT provisioning_jobs_status_check
    CHECK (status IN ('pending','running','completed','failed','rolled_back','paused'));
```

**Saga step boundaries:**
- Steps 1-4 (create-org, create-admin, assign-subdomain, seed-data): MUST succeed. Failure here → org doesn't exist yet → safe to return error to caller (no state to resume).
- Steps 5-9 (n8n-webhooks, deploy-automations, onboarding-sequence, qa-checks, schedule-onboarding-followups): PAUSE on failure. Org is usable. Operator resumes.
- Step 10 (new — schedule-onboarding-followups): enqueue 3 N8N onboarding workflows via N8N API.

### Pattern 4: Onboarding Progress Table

**What:** `onboarding_progress` tracks per-org day-of-onboarding state, completed steps, kickoff call scheduling, and timer start.

**Schema:**
```sql
-- migration 32
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  timer_started_at TIMESTAMPTZ,         -- NULL until Day 0 saga step completes
  timer_start_day DATE,                 -- business-day-aware date (skips weekends)
  day0_completed_at TIMESTAMPTZ,
  day1_email_sent_at TIMESTAMPTZ,
  day2_email_sent_at TIMESTAMPTZ,
  day3_email_sent_at TIMESTAMPTZ,
  brand_voice_completed_at TIMESTAMPTZ,
  kickoff_call_scheduled_at TIMESTAMPTZ,
  kickoff_call_url TEXT,
  steps_completed TEXT[] NOT NULL DEFAULT '{}',
  drift_flags TEXT[] NOT NULL DEFAULT '{}',  -- e.g. 'day1_email_failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Business day logic:** "3 business days" means Mon-Fri excluding SA public holidays. Simplification for v3.0: skip weekends only (no public holiday calendar). If signup is Fri after 17:00 SAST → Day 0 = Monday. Implement with `date-fns-tz` `addBusinessDays()` with `Africa/Johannesburg`.

### Pattern 5: USAGE-13 Migration Order

**What:** 7 legacy callsites using `checkUsage`/`incrementUsage` (which are silent no-ops today due to ERR-032) must be replaced with `guardUsage()` from `lib/usage/guard.ts`.

**Migration order (risk-ascending — least traffic first):**
1. `lib/billing/subscriptions.ts` — delete `handlePaymentComplete()` entirely (0 callers — confirmed in DIAGNOSTICS.md). Also delete `subscription_history` INSERT if table doesn't exist — or add migration 34 to create the table first.
2. `app/api/autopilot/chat/route.ts` — replace `checkUsage`/`incrementUsage` with `guardUsage({ orgId, metric: 'agent_invocations' })`
3. `app/api/autopilot/generate/route.ts` — same pattern
4. `app/api/content/generate/route.ts` — replace; this route also reads from legacy `users` table (`organization_id` query) — migrate to `getUserOrg()` pattern at same time
5. `app/api/content/generate/social/route.ts` — same
6. `app/api/content/generate/email/route.ts` — same
7. `app/api/email/send/route.ts` + `app/api/email/campaigns/[id]/send/route.ts` — add `guardUsage({ metric: 'email_sends' })` pre-check

**After all 7 are migrated:** Drop `increment_usage_metric` RPC (migration 35). Drop `client_usage_metrics` table (migration 35, same migration — table has 0 rows, confirmed).

**IMPORTANT:** `content/generate/route.ts` line 43 queries `from('users')` — this table does NOT exist in the shared-DB architecture (confirmed in CLAUDE.md: "There is NO standalone `users` table"). This read has been silently returning null and the route falls through to 404. This is ERR-033 (new latent bug surface — documented in latent bugs section below).

### Pattern 6: Module Picker UI (BILL-01, SITE-02)

**What:** Interactive module picker that lets user toggle Core + vertical + add-ons with live total update. Used on both the pricing page and within the checkout flow.

**RSC vs Client Islands decision:** The picker MUST be a Client Component (`'use client'`) — it has user interaction (toggle state) and live total calculation. The page shell can be RSC; the picker island is client.

**State management:** Local `useState` — no global state, no React Query. The composition total is pure client-side math from `billing_plans` and `billing_addons_catalog` data fetched server-side and passed as props.

**VAT calc location:** Server-side helper (pure function, no DB). `vatInclusivePrice(cents: number) = Math.round(cents * 1.15)`. Display as `formatPrice(vatInclusivePrice(cents))` + "incl. 15% VAT" label. Never calculate VAT client-side from floating point — always integer math on cents.

**Pricing page currently does not exist** — `app/pricing/` directory is empty (no `page.tsx` found). This is a new file.

### Pattern 7: Cost Monitoring UI (USAGE-11)

**Data sources (both already live in DB):**
- `daily_cost_rollup` (migration 27 + migration 30 RPC `aggregate_org_day_cost`) — cost per org per day
- `subscription_composition` (migration 23) — MRR per org

**API route:** `GET /api/admin/cost-monitoring` (platform_admin guarded). Joins `daily_cost_rollup` (last 30 days) with `organizations` and `subscription_composition` to compute:
- Cost MTD per org
- MRR per org (from `subscription_composition.monthly_total_zar_cents`)
- Margin % = `(MRR - cost_mtd) / MRR * 100`
- Flag: `cost_mtd > MRR * 0.4` = "40% MRR flag" (cost alarm)

**Existing admin page at `app/(dashboard)/admin/clients/page.tsx`** — already a client component with the table pattern. Cost monitoring extends this admin section as a new sibling page.

### Anti-Patterns to Avoid

- **Do not call brand voice from middleware** — voice fetch is a DB call; middleware must stay fast. Load voice lazily in the agent call path.
- **Do not pad brand voice with tenant-specific data** — padding must be stable text (SA English rules, module descriptions, generic context) or cache misses every time for new tenants.
- **Do not send all 4 onboarding emails immediately** — current `07-onboarding.ts` sends all 3 at once. Phase 10 replaces this with N8N-scheduled sends (Day 1 = +1 business day, etc.).
- **Do not use Resend `scheduledAt`** — Resend's scheduled send feature is unreliable for multi-day delays. Use N8N cron workflows with per-org triggers instead.
- **Do not rollback-cascade on step 5-9 failure** — this is the core Pitfall 10 fix. PAUSE, not delete.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 4096-token floor calculation | Manual character counting | `@anthropic-ai/sdk` `countTokens()` API or estimate at 4 chars/token | Token count is approximate — 4,096 tokens ≠ 16,384 chars exactly. Use conservative estimate: `text.length / 3.5` as floor check |
| PII detection | Regex gauntlet | Targeted regex set for SA patterns: `/@[\w.]+\.(co\.za|com|net)/`, `/(\+27|0)[0-9]{9}/`, `/\b[0-9]{13}\b/` (SA ID number), `/\b(sk-|AKIA|eyJ|ghp_)/` | POPI concerns are specific to SA context; no generic library needed |
| VAT-inclusive pricing | Custom VAT module | Integer math: `Math.round(cents * 1.15)` | 15% VAT is a single multiplier — no library justified |
| Business day calculation | Custom calendar | `date-fns addBusinessDays(date, n, { locale: ... })` — weekends only for v3.0 | SA public holidays not needed for v3.0; pure weekend skip is sufficient and honest |
| Usage warning banners | Custom state management | Component reads org usage from existing `record_usage_event` RPC response (% of limit) | Usage is already computed per guardUsage call; pass percentage as prop |

**Key insight:** The temptation in Phase 10 is to over-engineer brand voice storage (don't add a `brand_voice_versions` table for v3.0 — VOICE-08 re-run support just overwrites `client_profiles.brand_voice_prompt`). Version history is a v3.1 feature.

---

## Common Pitfalls

### Pitfall A: `subscription_history` table doesn't exist in live DB

**What goes wrong:** `lib/billing/subscriptions.ts` inserts into `subscription_history` at lines 287-302 and 359-370. This table was NOT created by any applied migration. PostgREST silently returns an error caught by `console.error` — no throw. When the first ITN fires in production, payment history is silently lost.

**Why it happens:** The table was assumed to exist from older schema but was never in a numbered migration applied to the live DB.

**How to avoid:** Migration 34 must create `subscription_history` before Phase 10 deploys any code that could trigger the ITN webhook (i.e., before any marketing or PayFast integration goes live).

**Warning signs:** First PayFast ITN succeeds (org status updated) but no row appears in `subscription_history`.

**This is ERR-033** — new latent bug surfaced during research.

### Pitfall B: `content/generate/route.ts` reads from non-existent `users` table

**What goes wrong:** `app/api/content/generate/route.ts` line 38 queries `from('users').select('organization_id')`. The shared-DB architecture has NO `users` table — users link via `organization_users` junction table. This query silently returns null, route returns 404. The content generate feature has never worked in the shared-DB architecture.

**How to avoid:** USAGE-13 migration of this route must also fix the org resolution to use `getUserOrg()` from `lib/auth/get-user-org.ts` (the standard pattern per CLAUDE.md).

**This is ERR-034** — new latent bug surfaced during research.

### Pitfall C: `app/api/autopilot/generate/route.ts` likely has same `users` table issue

**What goes wrong:** The autopilot routes use `getClientProfile(orgId)` which uses admin client to query `client_profiles`. But they get `orgId` from `getUserOrg()` indirectly via `userOrg.organizationId`. The chat route already uses `getUserOrg()` correctly — verify `generate` route does too.

**How to avoid:** Audit all 5 legacy routes during USAGE-13 for both the usage pattern AND the org resolution pattern.

### Pitfall D: `agent_sessions` table has no RLS

**What goes wrong:** Migration 25 created `agent_sessions` (recreated after gap) without RLS policies. Any authenticated user can read any tenant's agent sessions via PostgREST. This is a POPI concern if agent sessions contain brand voice or customer data in the `messages` JSONB.

**How to avoid:** Add RLS migration (migration 33 or standalone) before Phase 10 ships brand voice — voice content will be in agent session messages.

**Status:** Flagged in STATE.md pending todos. Phase 10 must address before brand voice goes live.

### Pitfall E: Org soft-archive needs `archived_at` column

**What goes wrong:** 4 dormant orgs need to be soft-archived (DIAGNOSTICS.md). The `organizations` table has no `archived_at` column. Using `status = 'archived'` is insufficient — status has no enum constraint and `get_user_org_id()` doesn't filter by status.

**How to avoid:** Migration 33: `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`. Update middleware tenant resolution to exclude `WHERE archived_at IS NULL`. The platform_admin org (`DragoonB Business Automation`) must be preserved — soft-archive the other 3 dormant orgs.

### Pitfall F: Hero copy "14-day free trial / No credit card required" is factually wrong

**What goes wrong:** Current `components/landing/sections.tsx` shows "14-day free trial" and "No credit card required" as trust indicators (lines 71-83). The v3.0 decision is payment-method-on-file for trial. Shipping the site redesign without fixing these trust signals misleads prospects.

**How to avoid:** SITE-01/05 must update trust indicators to "3 business days to go live" + "Pay in Rands" + "Cancel anytime" — matching the actual v3.0 offer.

### Pitfall G: Resend `from` address warm-up status unknown

**What goes wrong:** `07-onboarding.ts` sends from `noreply@draggonnb.online`. If SPF/DKIM/DMARC aren't verified or the domain isn't warmed up, onboarding emails land in spam. "3-day promise" fails silently.

**What to check BEFORE Phase 10 deploys onboarding pipeline:**
1. Run `https://www.mail-tester.com/` against a test email from `noreply@draggonnb.online`. Score must be >=9.
2. Verify Resend dashboard shows domain as "Verified" (DNS records confirmed).
3. If score <9: fix DNS records first (SPF, DKIM, DMARC are separate DNS TXT records that Resend provides).
4. Add plain-text alternative to every HTML email (spam filters penalize HTML-only).
5. Add unsubscribe link to Day 1, 2, 3 emails (POPI requirement — Day 0 welcome is transactional, exempt).

**Per Pitfall 14:** STATE.md has "Resend domain warm-up status check + mail-tester baseline before Phase 10" as a pending pre-flight item. This must be a hard blocker gating the onboarding pipeline plan execution.

### Pitfall H: `provisioning_jobs` status CHECK constraint doesn't include 'paused'

**What goes wrong:** Current check: `CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back'))`. Phase 10 saga PAUSE model needs 'paused'. Inserting 'paused' without the constraint update will fail with a PG check violation.

**How to avoid:** Phase 10 migration that modifies `provisioning_jobs` must also alter the constraint.

---

## Code Examples

### Brand Voice Wizard — URL Scraper

```typescript
// lib/brand-voice/scraper.ts
// Source: cheerio docs + research pattern
import * as cheerio from 'cheerio'

export interface ScrapedBrandContext {
  title: string | null
  description: string | null
  h1: string | null
  aboutText: string | null
  logoAlt: string | null
}

export async function scrapeWebsiteContext(url: string): Promise<ScrapedBrandContext> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DraggonnB-BrandWizard/1.0' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))
  
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  
  return {
    title: $('title').first().text().trim() || null,
    description: $('meta[name="description"]').attr('content') || null,
    h1: $('h1').first().text().trim() || null,
    aboutText: $('[class*="about"],[id*="about"]').first().text().slice(0, 500).trim() || null,
    logoAlt: $('img[class*="logo"],[id*="logo"]').first().attr('alt') || null,
  }
}
```

### Brand Voice PII Scrubber

```typescript
// lib/brand-voice/pii-scrubber.ts
// Pattern: SA-specific PII patterns (POPI Act compliance, VOICE-07)
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,      // email
  /(\+27|0)[6-8][0-9]{8}/g,                                       // SA mobile
  /\b[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{7}\b/g, // SA ID number
  /\b(sk-[A-Za-z0-9]{48}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9._-]+)\b/g, // API keys
  /\b4[0-9]{12}(?:[0-9]{3})?\b|\b5[1-5][0-9]{14}\b/g,          // credit card patterns
]

export function scrubPII(text: string): string {
  return PII_PATTERNS.reduce(
    (t, pattern) => t.replace(pattern, '[REDACTED]'),
    text
  )
}
```

### Padding Brand Voice to 4096-Token Floor

```typescript
// lib/brand-voice/pad-to-cache.ts
// Haiku 4.5 cache eligibility: >= 4096 tokens (VOICE-06)
// Conservative estimate: 3.5 chars per token
const CACHE_FLOOR_TOKENS = 4096
const CHARS_PER_TOKEN = 3.5
const FLOOR_CHARS = Math.ceil(CACHE_FLOOR_TOKENS * CHARS_PER_TOKEN) // ~14,336 chars

// Stable padding text — SA English style guide + module context
// This text does NOT change per tenant, maximising cache hit rate
const STABLE_PADDING = `
[SA ENGLISH STYLE GUIDE]
Use South African English spelling throughout: colour (not color), organise (not organize),
prioritise (not prioritize), recognised (not recognized). Use Rands (R) not USD ($).
Refer to South African cities, geography, and cultural context where relevant.
Calendar week starts Monday. Business hours: 08:00-17:00 SAST (Africa/Johannesburg, UTC+2).

[CONTENT STANDARDS]
- Keep sentence length under 25 words for clarity
- Active voice preferred over passive
- Avoid jargon unless industry-specific and defined
- Use Oxford comma in lists
- Format monetary amounts as R1,200 (not R1200 or R 1,200)
- Date format: DD Month YYYY (e.g., 26 April 2026)

[MODULE CONTEXT — DraggonnB OS]
This AI operates within DraggonnB OS, a multi-tenant business operations platform
for South African SMEs. Available modules: CRM & Pipeline, Email Campaigns,
Social Media Management, Accommodation Management, Restaurant Operations,
AI Business Agents, Analytics & Reporting.
...` // trimmed — full padding text must reach FLOOR_CHARS

export function padToCacheFloor(brandVoice: string): string {
  if (brandVoice.length >= FLOOR_CHARS) return brandVoice
  return brandVoice + '\n\n' + STABLE_PADDING.slice(0, FLOOR_CHARS - brandVoice.length)
}
```

### Usage Cap Modal (USAGE-04)

```typescript
// components/usage-cap-modal.tsx — 3-option inline modal
// Source: Pitfall 9 pattern from PITFALLS.md
interface UsageCapModalProps {
  metric: string
  resetAt: Date          // next monthly reset in Africa/Johannesburg
  onUpgrade: () => void
  onBuyOverage: () => void
  onDismiss: () => void
}

// Reset timestamp display: use date-fns-tz
import { formatInTimeZone } from 'date-fns-tz'
const resetDisplay = formatInTimeZone(resetAt, 'Africa/Johannesburg', "d MMMM 'at' HH:mm 'SAST'")
// e.g., "1 May at 00:00 SAST"
```

### Golden Two-Tenant Cache Test (VOICE-05)

```typescript
// __tests__/integration/brand-voice/cache-isolation.test.ts
// Tests: (1) different orgs produce different outputs, (2) same org gets cache hits on 2nd call
// Gate: requires TEST_CACHE_ORG_A and TEST_CACHE_ORG_B env vars (similar to TEST_CONCURRENCY_ORG_ID)
it.skipIf(!process.env.TEST_CACHE_ORG_A)('two orgs with different voices produce different output', async () => {
  // ... provision different brand voices, run identical prompts, assert different outputs
  // Also assert: response.usage.cache_read_input_tokens > 0 on second same-tenant call
})
```

### 301 Redirect Map

Current URL structure (from `app/` directory scan):
- `/` — landing page (stays `/`)
- `/login` — stays
- `/signup` — stays
- `/dashboard/*` — stays
- `/pricing` — currently does NOT exist as a route (empty directory). When added, no redirect needed.
- `/admin/*` — dashboard-scoped, no public URL change

No existing routes are being renamed — the site redesign is a UI overhaul of `app/page.tsx` and addition of `app/pricing/page.tsx`. **301 redirects are not needed** for Phase 10 because no existing indexed URLs are changing. The Search Console baseline is still needed (SITE-03) to detect any unintended regression.

Pre-launch 301 check: verify `/pricing` wasn't previously indexed under another URL (Search Console export).

---

## State of the Art

| Old Approach | Current Approach | Phase 10 Change |
|--------------|------------------|-----------------|
| Cascade-delete rollback on saga failure | PAUSE with resume | Replace `rollback.ts` org deletion with status='paused' + Telegram alert |
| All onboarding emails sent immediately on provision | Scheduled by N8N | N8N workflows triggered on Day 0, fire Day 1-3 via cron |
| `checkUsage`/`incrementUsage` (silent no-ops) | `guardUsage()` with advisory lock | 7-callsite migration in USAGE-13 |
| System prompt as raw string in BaseAgent | `SystemBlock[]` with cache_control | Already prepped in Phase 09; Phase 10 wires agents to load brand voice |
| No brand voice | `client_profiles.brand_voice_prompt TEXT` + `example_phrases TEXT[]` + `forbidden_topics TEXT[]` | New columns via migration 31 |
| No onboarding state tracking | `onboarding_progress` table | New table via migration 32 |
| No cost monitoring UI | `/admin/cost-monitoring` | New page consuming `daily_cost_rollup` + `subscription_composition` |

**Deprecated/outdated (delete in Phase 10):**
- `handlePaymentComplete()` in `lib/billing/subscriptions.ts` — 0 callers, silent no-op since Phase 09
- `checkUsage()` + `incrementUsage()` in `lib/tier/feature-gate.ts` — reads columns that don't exist
- `increment_usage_metric` RPC — operates on missing columns
- `client_usage_metrics` table — 0 rows, all columns misnamed

---

## Files Touched / New Files

### Modified Files
| File | Change | REQ |
|------|--------|-----|
| `lib/agents/base-agent.ts` | Load brand voice on each run; call `buildSystemBlocks()` | VOICE-03, VOICE-04 |
| `lib/agents/business-autopilot.ts` | Pass `SystemBlock[]` instead of string systemPrompt | VOICE-03 |
| `lib/agents/client-onboarding-agent.ts` | Same | VOICE-03 |
| `lib/agents/lead-qualifier.ts` | Same | VOICE-03 |
| `lib/agents/proposal-generator.ts` | Same | VOICE-03 |
| `lib/accommodation/agents/quoter-agent.ts` | Same | VOICE-03 |
| `lib/accommodation/agents/concierge-agent.ts` | Same | VOICE-03 |
| `lib/accommodation/agents/reviewer-agent.ts` | Same | VOICE-03 |
| `lib/accommodation/agents/pricer-agent.ts` | Same | VOICE-03 |
| `lib/billing/subscriptions.ts` | Delete `handlePaymentComplete()` | USAGE-13 |
| `lib/tier/feature-gate.ts` | Deprecate `checkUsage`/`incrementUsage` | USAGE-13 |
| `scripts/provisioning/orchestrator.ts` | Add `provisioning_jobs` step tracking; replace cascade-delete with PAUSE | ONBOARD-07 |
| `scripts/provisioning/rollback.ts` | Remove org cascade-delete; replace with PAUSE + alert | ONBOARD-07 |
| `scripts/provisioning/steps/07-onboarding.ts` | Replace immediate sends with N8N workflow triggers | ONBOARD-06 |
| `app/api/autopilot/chat/route.ts` | Replace `checkUsage`/`incrementUsage` with `guardUsage()` | USAGE-13 |
| `app/api/autopilot/generate/route.ts` | Same | USAGE-13 |
| `app/api/content/generate/route.ts` | Same + fix `from('users')` → `getUserOrg()` (ERR-034) | USAGE-13 |
| `app/api/content/generate/social/route.ts` | Same | USAGE-13 |
| `app/api/content/generate/email/route.ts` | Same | USAGE-13 |
| `app/api/email/send/route.ts` | Add `guardUsage({ metric: 'email_sends' })` | USAGE-13 |
| `app/api/email/campaigns/[id]/send/route.ts` | Same | USAGE-13 |
| `app/page.tsx` | Replace `HeroSection` + supporting sections with outcome-led redesign | SITE-01, SITE-05 |
| `components/landing/sections.tsx` | Fix false trust indicators; add module picker preview | SITE-01, SITE-04, SITE-05 |
| `next.config.mjs` | Add 301 redirects map (even if empty for Phase 10; scaffold for future) | SITE-03 |

### New Files
| File | Purpose | REQ |
|------|---------|-----|
| `lib/brand-voice/scraper.ts` | URL → scraped context | VOICE-01 |
| `lib/brand-voice/pii-scrubber.ts` | Strip SA PII before storage | VOICE-07 |
| `lib/brand-voice/wizard-questions.ts` | 5 guided question definitions | VOICE-01 |
| `lib/brand-voice/pad-to-cache.ts` | Ensure >=4096 token floor | VOICE-06 |
| `lib/brand-voice/build-system-blocks.ts` | Assemble `SystemBlock[]` for agent injection | VOICE-03, VOICE-04 |
| `lib/provisioning/saga-state.ts` | PAUSE-with-resume state machine | ONBOARD-07 |
| `app/(dashboard)/settings/brand-voice/page.tsx` | Wizard UI (multi-step) | VOICE-01, VOICE-08 |
| `app/(dashboard)/_components/usage-warning-banner.tsx` | 50/75/90% warning UI | USAGE-03 |
| `app/(dashboard)/_components/usage-cap-modal.tsx` | 100% cap inline modal | USAGE-04 |
| `app/pricing/page.tsx` | Pricing page with module picker (new route) | BILL-01, BILL-09, SITE-02 |
| `app/api/brand-voice/route.ts` | GET: fetch current voice | VOICE-01, VOICE-08 |
| `app/api/brand-voice/scrape/route.ts` | POST: URL → scraped text | VOICE-01 |
| `app/api/brand-voice/save/route.ts` | POST: wizard result → DB | VOICE-02, VOICE-07 |
| `app/api/admin/cost-monitoring/route.ts` | GET: cost vs MRR per tenant | USAGE-11 |
| `app/(dashboard)/admin/cost-monitoring/page.tsx` | Cost monitoring UI | USAGE-11 |
| `supabase/migrations/31_brand_voice_columns.sql` | ADD `brand_voice_prompt`, `example_phrases`, `forbidden_topics` to `client_profiles` | VOICE-02 |
| `supabase/migrations/32_onboarding_progress.sql` | CREATE `onboarding_progress` table | ONBOARD-05 |
| `supabase/migrations/33_org_archive_and_rls.sql` | ADD `archived_at` to `organizations`; ADD RLS to `agent_sessions` | ERR-033-adjacent, pending STATE.md todo |
| `supabase/migrations/34_subscription_history.sql` | CREATE `subscription_history` table (ERR-033 fix) | ERR-033 |
| `supabase/migrations/35_drop_legacy_usage.sql` | DROP `client_usage_metrics` + `increment_usage_metric` RPC (after USAGE-13 cleanup) | USAGE-13 |
| `__tests__/integration/brand-voice/cache-isolation.test.ts` | Golden two-tenant cache test | VOICE-05 |
| `__tests__/unit/brand-voice/pii-scrubber.test.ts` | PII scrubber unit tests | VOICE-07 |
| `__tests__/unit/brand-voice/pad-to-cache.test.ts` | Token floor padding tests | VOICE-06 |
| `__tests__/unit/usage/usage-warning.test.ts` | 50/75/90% threshold tests | USAGE-03 |

---

## Brand Voice Wizard — Recommended 5 Questions

These 5 questions plus the URL scrape produce sufficient signal for a >=4,096-token brand voice doc:

1. **Tone** — "How would you describe your brand's personality? (e.g., professional and trustworthy / warm and approachable / bold and confident)" [multi-select + custom]
2. **Audience** — "Who is your primary customer? Describe them in 2-3 sentences. What do they worry about? What outcome do they want?" [textarea]
3. **Differentiator** — "What makes your business different from competitors? What's the one thing you want customers to remember?" [textarea]
4. **Example phrases** — "Share 2-3 phrases, slogans, or sentences that sound exactly like your brand. Copy from your own marketing if you have it." [textarea → stored in `example_phrases TEXT[]`]
5. **Avoid list** — "Are there any topics, words, or tones you NEVER want in your communications? (e.g., politics, aggressive sales language, competitor names)" [textarea → stored in `forbidden_topics TEXT[]`]

**Assembled brand voice prompt structure:**
```
BRAND VOICE — {business_name}
Industry: {industry} | Location: {location} | Target: {target_market}
Website context: {scraped_description}

TONE: {tone selection}
AUDIENCE: {audience answer}
DIFFERENTIATOR: {differentiator answer}

PHRASES THAT SOUND LIKE US:
{example_phrases as bullet list}

NEVER USE OR MENTION:
{forbidden_topics as bullet list}

BRAND VALUES: {existing client_profiles.brand_values as CSV}

[STABLE PADDING BEGINS HERE — SA English guide + module context]
```

---

## Latent Bugs / Catastrophic Risks

### ERR-033 (NEW — discovered during research)
**Description:** `subscription_history` table does not exist in live DB. `lib/billing/subscriptions.ts` inserts into it at lines 287-302 and 359-370 (both `processSuccessfulPayment` and `processFailedPayment`). Silently fails — PostgREST error caught by `console.error`. Payment history will be permanently lost on first real ITN.
**File:** `lib/billing/subscriptions.ts` lines 287-302, 359-370
**Fix:** Migration 34 — `CREATE TABLE subscription_history` before first production PayFast ITN.
**Severity:** HIGH — lost payment audit trail is a compliance and dispute-resolution problem.

### ERR-034 (NEW — discovered during research)
**Description:** `app/api/content/generate/route.ts` line 38 queries `from('users').select('organization_id')`. The `users` table does not exist in the shared-DB architecture (CLAUDE.md: "There is NO standalone `users` table"). This has been silently returning 404 for every content generation request. The content generate feature is completely broken in production.
**File:** `app/api/content/generate/route.ts` line 38
**Fix:** Replace with `getUserOrg()` pattern (USAGE-13 Plan).
**Severity:** HIGH — entire content generation feature non-functional.

### ERR-035 (NEW — likely, unverified)
**Description:** `app/api/autopilot/generate/route.ts` — verify whether it also queries `from('users')` for org resolution or already uses `getUserOrg()`. The `chat` route correctly uses `getUserOrg()` but `generate` may not (pattern divergence).
**File:** `app/api/autopilot/generate/route.ts`
**Fix:** Read file during USAGE-13 plan execution and verify.
**Severity:** MEDIUM — feature may be non-functional if affected.

### Ongoing Risk: `agent_sessions` has no RLS

Cross-tenant data visibility is possible for any authenticated user who knows how to hit PostgREST directly. With brand voice being stored in agent session messages (VOICE-03), this becomes a POPI risk. Migration 33 must add RLS before brand voice goes live. This is CATASTROPHIC if brand voice data (business strategy, customer info) leaks between tenants.

---

## Scope Tightening — What to Defer to v3.1 If Time Pressure

If launch-next-week is at risk, defer in this order (least revenue impact first):

1. **Golden two-tenant cache test (VOICE-05)** — the isolation works by design if `buildSystemBlocks()` is correct. Defer CI test; do manual verification instead. Risks: Pitfall 4 (cache collision) undetected. MEDIUM risk deferral.
2. **`/admin/cost-monitoring` UI (USAGE-11)** — data is in DB, operator can query directly. Defer UI. Cost monitoring works via SQL for a week. LOW risk deferral.
3. **Brand voice re-run wizard (VOICE-08)** — initial voice is captured; re-run can be added after launch. LOW risk deferral.
4. **Org soft-archive for 3 dormant orgs** — platform_admin org stays; other dormants are inactive. LOW risk deferral.

**DO NOT defer:**
- USAGE-13 cleanup (latent defects — all usage caps are currently no-ops)
- Provisioning saga PAUSE model (Pitfall 10 — first client saga failure = broken onboarding)
- ERR-033 fix (`subscription_history` table)
- ERR-034 fix (content generate broken)
- Brand voice wizard + injection (it's the phase's namesake)
- Onboarding pipeline (3-day promise is the phase exit criterion)
- Pricing page with module picker (BILL-01 — prerequisite to first paying client)
- 360px mobile sweep on pricing/signup pages (SA market is mobile-first)

---

## Open Questions

1. **Cal.com vs manual link for kickoff call (ONBOARD-02)**
   - What we know: ONBOARD-02 requires a kickoff call link in Day 1 email. Cal.com is referenced in REQUIREMENTS.md.
   - What's unclear: Is Chris using Cal.com already? Does a Cal.com account exist? If not, a simple Calendly link or even a static "Book a call" URL works.
   - Recommendation: Use a configurable env var `KICKOFF_CALL_URL` defaulting to a placeholder. Chris fills in the real URL before deployment.

2. **N8N workflow IDs for onboarding sequences**
   - What we know: Current N8N has 16 workflows for accommodation + billing. No onboarding-specific workflows exist.
   - What's unclear: Exact N8N API call to trigger a per-org scheduled workflow (vs. the current webhook trigger approach).
   - Recommendation: Research in the N8N plan step. Two options: (a) webhook trigger per org from provisioning step 10, (b) cron workflow that reads `onboarding_progress` table and sends emails per day. Option (b) is more robust (retryable).

3. **`activated_at` column application status**
   - What we know: Migration 29 (`add_payfast_subscription_token`) includes `activated_at` per STATE.md. Manual application was required.
   - What's unclear: Was it applied? DIAGNOSTICS.md Open Question 5 flags this.
   - Recommendation: Verify via Supabase dashboard before Phase 10 plan execution. If missing, it must be applied before any ITN processing logic runs.

4. **Pricing page `billing_addons_catalog` seeded data**
   - What we know: Migration 24 seeds the addons catalog. The `compose()` function reads from it.
   - What's unclear: What module addon IDs exist in the live DB? The module picker UI needs to list these dynamically.
   - Recommendation: Query `billing_addons_catalog` early in plan execution to confirm seeded modules and their `id` values before building the picker UI.

---

## Sources

### Primary (HIGH confidence)
- `lib/agents/base-agent.ts` — Phase 09 rewrite, `SystemBlock[]` support already in place, `normalizeSystem()` at line 80
- `lib/usage/guard.ts` — `guardUsage()` implementation with advisory lock, correct path for USAGE-13
- `scripts/provisioning/orchestrator.ts` + `rollback.ts` — cascade-delete behavior confirmed
- `scripts/provisioning/steps/07-onboarding.ts` — sends all emails immediately, no scheduling
- `lib/autopilot/client-profile.ts` — `client_profiles` current schema (lacks `brand_voice_prompt`, `example_phrases`, `forbidden_topics`)
- `.planning/phases/09-foundations-guard-rails/09-DIAGNOSTICS.md` — ERR-032 callsite inventory confirmed, 0 paying orgs confirmed, `subscription_history` missing confirmed
- `.planning/research/PITFALLS.md` — Pitfalls 4, 9, 10, 13, 14, 16, 19, 23, 24 directly applicable
- `supabase/migrations/05_leads_and_agents.sql` — `provisioning_jobs` schema confirmed
- `app/api/content/generate/route.ts` — `from('users')` query confirmed at line 38 (ERR-034)
- `app/api/autopilot/chat/route.ts` — `checkUsage`/`incrementUsage` legacy pattern confirmed
- `lib/billing/composition.ts` + `lib/billing/addons-catalog.ts` — composition engine shape confirmed

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — cheerio as URL scraper recommended; `@tanstack/react-table` for monitoring UI; prompt caching economics
- `.planning/research/PITFALLS.md` — Anthropic 4096-token Haiku floor, Resend deliverability, 3-day promise mechanics
- `components/landing/sections.tsx` — false trust indicators confirmed at lines 71-83 (Pitfall F)

### Tertiary (LOW confidence)
- cheerio as URL scraper — confirmed via prior STACK.md research (WebSearch-sourced); no Context7 verification available. Alternative: `node-html-parser` if cheerio has Vercel compatibility issues.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries already in place; cheerio is MEDIUM (new install)
- Architecture: HIGH — codebase read directly; patterns derived from existing implementations
- Pitfalls: HIGH — ERR-033 and ERR-034 are code-verified latent bugs; others from DIAGNOSTICS.md
- Migration sequence: HIGH — DIAGNOSTICS.md callsite inventory is definitive

**Research date:** 2026-04-26
**Valid until:** 2026-05-10 (14 days; stable domain — schema additions are the main moving target)
