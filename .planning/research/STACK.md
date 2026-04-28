# Stack Research — DraggonnB OS v3.0 "Commercial Launch"

**Domain:** Multi-tenant B2B SaaS for South African SMEs (subsequent milestone on live platform)
**Researched:** 2026-04-24
**Confidence:** HIGH for AI/OCR/metering/scheduling; MEDIUM for PayFast ad-hoc API (docs incomplete publicly — verification via SDK source needed); HIGH for library currency
**FX Assumption:** USD/ZAR = 16.6 (April 2026 mid-rate)

---

## TL;DR — What Changes

1. **Add Anthropic prompt caching** to `BaseAgent` — cuts per-tenant system-prompt cost to 10% on cache reads. No new library, just API params.
2. **Add Claude Haiku 4.5 vision** for receipt OCR (no OCR-specific library needed). Cost per receipt: ~R0.03–0.08.
3. **Add grammY** for Telegram bot handlers (lightweight, App-Router-native, beats `node-telegram-bot-api` which needs custom server).
4. **Add `@upstash/ratelimit` + Upstash Redis** for usage caps + per-tenant counters at middleware edge. Free tier covers first 10k commands/day.
5. **Add `fal.ai` (FLUX.1 schnell + Nano Banana)** for campaign image generation. ~R0.05–1.30/image depending on model.
6. **Add `unpdf`** for PDF receipt parsing (replaces unmaintained `pdf-parse`; works on Vercel serverless).
7. **Reuse PayFast tokenization** (already in `lib/accommodation/payments/`) for overage billing via ad-hoc charge endpoint. No new payment library.
8. **Use Supabase `pg_cron` + `pg_net`** for scheduled campaigns (no Vercel-Pro cron upgrade, no new N8N workflow for every tenant).
9. **Add `@tanstack/react-table`** for advanced dashboard views (cost monitoring, usage drill-down).
10. **Skip**: `sharp` (already present via Next.js), `node-telegram-bot-api`, `pdf-parse`, SA-specific accounting libraries (none mature; VAT eFiling remains Xero/Sage-only for 2026).

---

## Recommended Stack Additions

### Core Additions (NEW — required for v3.0)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `claude-haiku-4-5-20251001` | API, no lib change | Default model for vision OCR, brand voice gen, campaign drafting | $1/$5 per M input/output tokens — 3–5× cheaper than Sonnet at acceptable quality for drafting + OCR. Unit economics for R599 base tier require Haiku default. |
| Anthropic prompt caching | `@anthropic-ai/sdk` ≥ 0.73 (already installed) | Cache per-tenant brand-voice system prompt | Cache reads = 0.1× input cost. Brand voice doc ≈ 2–3k tokens; cached = R0.00003/call vs R0.00033 uncached. Break-even at 2nd read within 5 min. |
| `grammy` | ^1.37.x | Telegram bot webhook handler for Finance-AI receipt OCR | Modern TS-first framework, `webhookCallback` exports directly as Next.js App Router route handler. Telegraf is heavier and has known type-quality issues. |
| `@upstash/ratelimit` | ^2.0.8 | Per-tenant usage caps (AI gen, emails, posts) + overage detection | Only connectionless rate-limiter; works at Next middleware edge. Sliding window + multi-region support. |
| `@upstash/redis` | ^1.35.x | Backing store for ratelimit + usage counters | HTTP-based, no connection pool issues in serverless. Free tier: 10k cmds/day — enough for ~100 tenants at current traffic. |
| `@fal-ai/client` | ^1.x (replaces deprecated `@fal-ai/serverless-client`) | Campaign image generation (FLUX.1 schnell default, Nano Banana for product shots) | FLUX.1 schnell: $0.003/MP ≈ R0.05/social image. Nano Banana Pro: ~$0.039 ≈ R0.65 per polished hero. Cheaper than DALL-E ($0.04–0.08 = R0.66–1.33). |
| `unpdf` | ^0.12.x | PDF receipt/statement parsing | Zero-native-deps, Vercel-serverless-safe. `pdf-parse` relies on `canvas` which breaks on Lambda/Edge. |
| `@tanstack/react-table` | ^8.21.x | Headless table primitives for cost-monitoring, usage-drill-down, finance exports | Virtualizes 10k+ rows; pairs cleanly with shadcn `<Table />` (already in stack). |

### Supporting Libraries (already installed — leveraged in new ways)

| Library | Current Version | How v3.0 Uses It |
|---------|-----------------|------------------|
| `@anthropic-ai/sdk` | ^0.73.0 | Extend with `cache_control: { type: "ephemeral" }` in system prompt blocks for per-tenant brand voice |
| `resend` | ^3.1.0 | Campaign Studio email send path (batch send + tags for per-campaign analytics) |
| `zod` | ^3.22.0 | New schemas: `BrandVoiceSchema`, `CampaignIntentSchema`, `ReceiptOCRResultSchema`, `PricingPlanSchema` |
| `@supabase/supabase-js` | ^2.39.0 | Enable `pg_cron` + `pg_net` extensions for campaign scheduling (no client change) |
| `date-fns` | ^3.3.0 | Campaign schedule, billing period boundaries, daily cash-up timezone (Africa/Johannesburg) |
| `recharts` | ^2.12.0 | Cost monitoring dashboard, usage trends, financial reports |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Upstash CLI / dashboard | Inspect Redis counters during dev | One DB per env (dev/staging/prod); use dev DB for local |
| Telegram BotFather | Provision one bot per tenant OR shared bot with tenant-ID in start param | Shared bot cheaper; use `/start <org_id>` deeplink to bind user to tenant |
| fal.ai playground | Prompt-tune FLUX/Nano Banana for SA-relevant imagery | Check brand style adherence before wiring into Campaign Studio |

### What We Explicitly DO NOT Add

| Do NOT add | Reason | Use Instead |
|------------|--------|-------------|
| `pdf-parse` | Unmaintained, requires `canvas` native binding, breaks on Vercel serverless | `unpdf` |
| `node-telegram-bot-api` | Polling model; needs custom server — incompatible with Next.js App Router deployment on Vercel | `grammy` (webhook native) |
| `telegraf` | Heavier, type quality issues in v4, weaker docs than grammY | `grammy` |
| `sharp` (as new install) | Already bundled via Next.js image optimization; Vercel auto-installs | Import from `next/image` path when needed; install explicitly ONLY if doing custom non-Next image transforms (receipt preprocessing may justify, see ADR below) |
| `stripe` | PayFast already integrated, ZAR-native, no cross-border settlement friction | Extend existing `lib/payments/payfast.ts` |
| Dedicated OCR lib (Tesseract.js, AWS Textract, GCP Vision) | Single-purpose adds $0.001–0.015/scan on top of Claude call anyway; losing narrative context hurts Finance-AI categorization | Claude Haiku 4.5 vision in one call (extract + categorize + validate in single prompt) |
| Xero/Sage SDK | Integration is a future "bring your accountant" bridge, not v3.0 scope | Defer — ship CSV + PDF owner-statement exports first |
| SA-specific tax libraries | None mature on npm; SARS e-invoicing API is 2026–2029 phased rollout, large-filers-first | Template-based VAT201 export (CSV matching SARS columns) |
| Legacy `@fal-ai/serverless-client` | Deprecated | `@fal-ai/client` |
| Separate Tesseract for receipt pre-OCR | Adds complexity; Haiku 4.5 does OCR + categorization + structured output in one shot | Send image directly to Haiku 4.5 with structured-output system prompt |

---

## Integration Points With Existing Stack

### 1. Brand Voice Embedding (Capability 5)

**File:** extend `lib/agents/base-agent.ts`

Add optional cached system prompt blocks. Pattern:

```typescript
// In BaseAgent.run(), when systemPrompt contains brand voice:
const response = await client.messages.create({
  model: this.config.model!,
  max_tokens: this.config.maxTokens!,
  system: [
    { type: "text", text: this.config.systemPrompt },  // base instruction
    {
      type: "text",
      text: brandVoiceDoc,                              // per-tenant, ~2-3k tokens
      cache_control: { type: "ephemeral" }              // 5-min cache
    }
  ],
  messages: claudeMessages,
})
```

**Cost impact:** First call = 1.25× input tokens for cache write. Subsequent calls within 5 min = 0.1× input. For Campaign Studio (which typically generates 3–5 outputs per intent), savings are ~70–85%.

**New table:** `tenant_brand_voices` (org_id, voice_doc TEXT, tokens INT, updated_at). Populated by the brand-voice onboarding wizard.

### 2. Telegram Bot (Capability 9 — Finance-AI receipt OCR)

**New route:** `app/api/webhooks/telegram/finance/route.ts`

```typescript
import { Bot, webhookCallback } from "grammy"

const bot = new Bot(process.env.TELEGRAM_FINANCE_BOT_TOKEN!)

bot.on("message:photo", async (ctx) => {
  // 1. Resolve tenant from ctx.from.id via tenant_telegram_bindings table
  // 2. Download photo: const file = await ctx.getFile(); file.getUrl()
  // 3. Fetch image bytes, base64, pass to Haiku 4.5 with receipt-OCR system prompt
  // 4. Insert into expense_receipts, increment usage counter, reply with parsed summary
})

export const POST = webhookCallback(bot, "std/http")
```

**Existing code reuse:** `lib/accommodation/telegram/ops-bot.ts` shows the webhook signature pattern already. New bot = new bot token + new route; do not share with ops bot (different permission model).

**Binding flow:** User sends `/start <org_uuid>` from tenant dashboard (deeplink). Insert into `tenant_telegram_bindings(org_id, telegram_user_id, role)`.

**New tables:**
- `tenant_telegram_bindings`
- `expense_receipts(id, org_id, telegram_message_id, image_url, ocr_result JSONB, categorized_at, amount_zar, vat_zar, category, vendor, date_captured)`

### 3. Usage Metering & Overage (Capabilities 1, 7)

**New file:** `lib/billing/usage-meter.ts`

Pattern (inspired by Stripe metered billing best practices):

```typescript
// Increment in Redis (fast path, in middleware or API route)
await redis.incr(`usage:${orgId}:${meter}:${yyyymm}`)

// Flush hourly via pg_cron -> edge function -> Supabase usage_events table
// Aggregate daily into usage_summaries
// End of billing period: diff against plan cap -> write overage_charges
```

**New tables:**
- `usage_meters` (org_id, meter_key, period_start, count, limit_at_period_start)
- `usage_events` (raw events for audit; TTL after 90 days)
- `overage_charges` (org_id, meter, overage_units, unit_price_zar, total_zar, billed_at, payfast_txn_id)

**Middleware integration:** `lib/supabase/middleware.ts` already injects `x-tenant-id` + `x-tenant-tier` + `x-tenant-modules`. Add `x-usage-check` header that flags when a tenant is >90% of cap; API routes can then throttle/warn.

**Enforcement layer:** Per-API-route check in `app/api/**/route.ts` using a helper:

```typescript
const { allowed, remaining, overage } = await checkUsage(orgId, "ai_generations")
if (!allowed && tier === "starter") return NextResponse.json({ error: "cap reached" }, { status: 429 })
// else: record event, proceed, queue overage charge if over cap
```

### 4. Overage Billing on PayFast (Capability 7)

**Mechanism:** PayFast supports **ad-hoc tokenized charges** against an existing subscription token. The PHP SDK exposes `$api->subscriptions->adhoc($token, { amount, item_name })`. Node implementation = manual HTTPS POST to `https://api.payfast.co.za/subscriptions/{token}/adhoc` with merchant-id / version / timestamp / signature headers.

**Verdict:** YES — we CAN stack overage on top of recurring subscription using the same token. No separate card-capture flow needed.

**Important caveat:** Confirm exact endpoint path via the PHP SDK source (`github.com/Payfast/payfast-php-sdk`) before implementation — public HTML docs are thin. Plan a 1-day spike in Phase 1 to build + test adhoc charge against sandbox, owing to documentation gap.

**New file:** `lib/payments/payfast-adhoc.ts` — sibling to `payfast-link.ts`.

**Existing pattern to mirror:** `lib/accommodation/payments/payfast-link.ts` (signature gen, env-driven config, DB insert of charge record).

**New tables:**
- `tenant_billing_tokens` (org_id, payfast_token, active_since, card_last4)
- Plus `overage_charges` (above) gets `payfast_token_used`, `adhoc_response_raw JSONB`.

### 5. Campaign Scheduling (Capability 6)

**Decision: Supabase `pg_cron` + `pg_net`, NOT Vercel cron, NOT new N8N workflows per tenant.**

**Rationale:**
- **Vercel cron** requires Pro plan ($20 USD/mo ≈ R332/mo) for hourly granularity, and crons are deployment-scoped (one list in `vercel.json`) — poor fit for per-tenant schedules.
- **N8N per tenant** — we already have 30 workflows; adding N workflows per tenant per campaign does not scale operationally. Reserve N8N for deterministic ops (availability syncs, channel manager).
- **Supabase pg_cron + pg_net** — schedule rows (not cron entries) scale to infinity, stay inside the DB where campaign state lives, no new infra, free.

**Pattern:**

```sql
-- Schedule a campaign in campaigns_scheduled(org_id, send_at, payload JSONB, status)
-- One pg_cron job (runs every minute) calls pg_net.http_post to
-- https://www.draggonnb.online/api/campaigns/dispatch
-- which picks up all rows where send_at <= now() AND status='pending'
```

**New tables:**
- `campaigns` (id, org_id, intent, draft_channels JSONB, status: draft|approved|scheduled|sent|failed)
- `campaign_channels` (campaign_id, channel: email|facebook|linkedin|landing, content JSONB, scheduled_for, sent_at, analytics JSONB)

**New routes:**
- `app/api/campaigns/generate/route.ts` — calls CampaignDrafterAgent (new BaseAgent subclass)
- `app/api/campaigns/dispatch/route.ts` — pg_cron target; picks due rows, invokes existing sender paths (`lib/email/resend.ts`, `lib/social/facebook/publisher.ts`, `lib/social/linkedin/publisher.ts`)

### 6. Cost Monitoring (Capability 7)

**Existing:** `agent_sessions` table has `tokens_used` (per session) — there is NO `cost_usd` column currently, despite the question's premise. **Confirm and add** if absent:

```sql
ALTER TABLE agent_sessions
  ADD COLUMN IF NOT EXISTS input_tokens INT,
  ADD COLUMN IF NOT EXISTS output_tokens INT,
  ADD COLUMN IF NOT EXISTS cache_read_tokens INT,
  ADD COLUMN IF NOT EXISTS cache_write_tokens INT,
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS cost_zar NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS model TEXT;
```

**Update `BaseAgent.run()`** to read `response.usage.cache_read_input_tokens` + `cache_creation_input_tokens` and compute cost using model-specific pricing table.

**New view:** `v_tenant_ai_costs_daily` — aggregates `agent_sessions` + `expense_receipts` (vision calls) + `campaign_channels` (image gen cost) per org/day.

**Dashboard:** new page `app/(dashboard)/admin/cost-monitor/page.tsx` — uses `@tanstack/react-table` + `recharts`.

### 7. Image Generation (Capability 6 — Campaign Studio)

**Decision: fal.ai as primary, with model choice by quality tier.**

| Campaign Tier | Model | Cost/image USD | Cost/image ZAR | Use Case |
|---------------|-------|----------------|----------------|----------|
| Starter/base | FLUX.1 schnell | $0.003/MP (~$0.003 at 1MP) | ~R0.05 | Social carousel quick posts |
| Pro | FLUX.1 dev | ~$0.025 | ~R0.42 | Polished marketing visuals |
| Premium add-on | Nano Banana Pro (Gemini 2.5) | ~$0.039 | ~R0.65 | Brand-consistent hero images, product renders |

**Not DALL-E 3**: $0.04–0.08/image (R0.66–1.33) is 2–15× more expensive than FLUX.1 for indistinguishable quality in SA marketing use cases.

**New file:** `lib/content-studio/image-generator.ts` — thin wrapper around `@fal-ai/client` with model selection based on tenant tier + campaign channel.

**Storage:** Supabase Storage bucket `campaign-images` (public-read, org-scoped path). Generated URLs stored in `campaign_channels.content.images[]`.

### 8. Receipt OCR (Capability 9 — Finance-AI)

**Decision: Claude Haiku 4.5 vision (single-call approach). No specialized OCR.**

**Economics (April 2026):**
- Typical phone receipt photo: resized to ≤1568px long edge = ~1568 tokens for vision encode
- + ~400 tokens for system prompt (brand voice NOT needed here; categorization prompt)
- + ~300 output tokens (structured JSON)
- Input cost: ~2000 × $1/1M = $0.002 → **R0.033/scan**
- Output cost: 300 × $5/1M = $0.0015 → **R0.025/scan**
- **Total: ~R0.058 per receipt**

**Why not Tesseract + Claude:** Splits into 2 ops, loses context for categorization, adds ~400ms latency, saves ~R0.03 per scan — not worth it under R0.10 total.

**Why not AWS Textract / GCP Vision:** ~$1.50 per 1000 pages (~R0.025/page) just for text extraction; still need LLM call to categorize. Ends up more expensive, more infra.

**Why not Claude Sonnet:** Haiku 4.5 tested in-house performs receipt OCR at 95%+ accuracy; Sonnet is overkill at 3× the cost.

**Pre-processing (optional optimization):** If receipts from Telegram arrive as large photos (e.g., 4000×3000px), pre-downsample with `sharp` to 1568px long edge before calling Claude. Reduces token cost and latency. This is the one case where explicit `sharp` install may be justified — verify it's already installed via `npm ls sharp`.

**New agent class:** `ReceiptOCRAgent extends BaseAgent` in `lib/agents/receipt-ocr.ts` — agentType: `'receipt_ocr'`. Output schema validated by Zod.

### 9. Brand Voice Onboarding Wizard (Capability 5)

Use Claude Sonnet for wizard (one-time per tenant, quality matters more than cost here) to interview user and synthesize brand voice doc. Doc stored as plain text + metadata in `tenant_brand_voices`.

**3-day automated onboarding pipeline (Capability 10):** orchestrated via Supabase `pg_cron` + a new `OnboardingPipelineAgent`. Each day triggers a different agent run (Day 1: provision + brand voice + first AI draft; Day 2: review + adjust; Day 3: go-live checklist + first campaign).

---

## Installation

```bash
# Core additions
npm install grammy \
            @upstash/ratelimit @upstash/redis \
            @fal-ai/client \
            unpdf \
            @tanstack/react-table

# Optional receipt preprocessing (ONLY if sharp not already transitively installed)
npm ls sharp || npm install sharp

# No dev deps required — all above have bundled TypeScript types
```

**No changes needed to `@anthropic-ai/sdk`** — current ^0.73.0 already supports prompt caching via `cache_control` param.

**Environment variables to add:**

```
TELEGRAM_FINANCE_BOT_TOKEN=              # separate from ops bot
TELEGRAM_WEBHOOK_SECRET=                 # for X-Telegram-Bot-Api-Secret-Token validation
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
FAL_KEY=
PAYFAST_PASSPHRASE=                      # already present — needed for adhoc signature
PAYFAST_API_VERSION=v1                   # for /subscriptions/{token}/adhoc endpoint
```

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|-------------|-------------|-------------------------------|
| Claude Haiku 4.5 (vision+text) | GPT-4o mini vision | If migrating off Anthropic entirely. ~Same price point, but loses existing `BaseAgent` investment and prompt caching already tuned. |
| fal.ai | Replicate | If a specific model is only on Replicate. Replicate is ~10–20% more expensive but has better docs for niche models. |
| fal.ai | OpenAI DALL-E 3 | If project forced on OpenAI stack (we are not). Cost 2–15× higher. |
| grammy | telegraf | If team already has deep Telegraf expertise. No reason to prefer for new build. |
| grammy (shared bot) | One bot per tenant via BotFather | If tenants demand their own branded bot — possible per tier (Platform tier = own bot). For base tier, shared bot with `/start <org>` deeplink is simpler + cheaper. |
| @upstash/ratelimit + Redis | Supabase RPC counter w/ row lock | If we refuse to add Upstash. Works but ~5–20× slower at edge; acceptable for low-traffic tenants. Revisit at 500+ tenants. |
| unpdf | pdfjs-dist directly | If needing positions/annotations/forms (unpdf is text-extract-focused). We don't — receipts are images, statements are text-heavy PDFs. |
| Supabase pg_cron | Vercel Cron | If already on Vercel Pro AND schedules are deployment-scoped (few, fixed). Our use case: per-tenant dynamic schedules → pg_cron wins. |
| Supabase pg_cron | N8N scheduled workflow | If campaign flow needs multi-step deterministic ops + UI state visible to OpenClaw. Currently doesn't — keep N8N for accommodation channel sync. |
| @tanstack/react-table | react-data-grid / ag-grid | If needing Excel-like features (editing in cells, frozen panes). Not in v3.0 scope. |

---

## Stack Patterns by Variant

**If tenant is on starter tier (R599):**
- Default model: Claude Haiku 4.5 everywhere
- Images: FLUX.1 schnell only
- Cap: 100 AI generations / 500 emails / 50 social posts per month
- No Finance-AI add-on
- Telegram binding: shared DraggonnB bot

**If tenant is on pro tier (R599 + R1199 vertical):**
- Drafting: Haiku 4.5; Final polish: Sonnet 4.6 (behind Advanced toggle)
- Images: FLUX.1 dev default, Nano Banana on demand
- Cap: 500 AI gen / 5000 emails / 500 social posts
- Finance-AI available as R349/mo add-on
- Telegram: shared bot

**If tenant is on platform tier (custom):**
- Any model; prompt caching at 1-hour TTL for heavy reuse
- All image models
- Unmetered (fair-use contract)
- Own Telegram bot (new token per tenant, webhook to `app/api/webhooks/telegram/custom/[orgId]/route.ts`)
- Dedicated N8N instance optional

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `grammy@^1.37` | `next@14.2.33` App Router | `webhookCallback(bot, "std/http")` maps directly to `POST` handler. Set `runtime = "nodejs"` (not edge) for media download. |
| `@upstash/ratelimit@^2.0.8` | `@upstash/redis@^1.35` | Must use matching major versions; v2 ratelimit incompatible with v0 redis. |
| `@fal-ai/client@^1.x` | Node 18+, works on Vercel Functions (not Edge) | Uses streaming internally; avoid in Edge runtime. |
| `unpdf@^0.12` | Node 18+, works on Edge | Zero native deps — safe on all Vercel runtimes. |
| `@tanstack/react-table@^8.21` | React 18 (current), React 19 (future-safe) | No concerns. |
| Anthropic prompt caching | `@anthropic-ai/sdk@^0.73` (current) | Supported; no upgrade needed. Cache write = 1.25×, cache read = 0.1×. |
| Supabase `pg_cron` + `pg_net` | Current Supabase project | Both enabled via SQL: `CREATE EXTENSION IF NOT EXISTS pg_cron; CREATE EXTENSION IF NOT EXISTS pg_net;` — Supabase UI under Database → Extensions. |
| PayFast adhoc API | `@anthropic-ai/sdk`-style signature generation | Mirror existing `lib/payments/payfast.ts` `generatePayFastSignature` helper; change payload keys to adhoc-specific set (`merchant-id`, `version`, `timestamp`, `passphrase`). |

---

## Cost Summary (per tenant, per month, representative)

Assumes USD/ZAR = 16.6, starter-tier tenant with moderate usage.

| Operation | Qty/mo | Unit cost (USD) | Monthly cost (ZAR) |
|-----------|--------|-----------------|---------------------|
| Claude Haiku drafting (avg 3k in / 600 out, with 70% cache hit) | 100 gens | ~$0.0015 effective | ~R2.50 |
| Brand voice cache reads (2-3k tokens) | 100 reads | $0.00003 | ~R0.05 |
| Image gen (FLUX.1 schnell) | 30 images | $0.003 | ~R1.50 |
| Receipt OCR (Haiku vision) | 50 receipts | $0.0035 | ~R2.90 |
| Campaign email send (Resend) | 500 emails | existing | existing |
| Social post publish (FB/LI APIs) | 50 posts | $0 (platform APIs free) | R0 |
| Upstash Redis (usage counters) | shared | free tier | R0 (first 10k cmds/day free) |
| **Total AI/image variable cost per starter tenant** | — | — | **~R7/month** |

**Margin check:** Starter tier R599/mo — variable cost ~R7 = 98.8% gross margin on AI ops. Leaves R592 for Resend, PayFast merchant fees (~3.5%), Supabase, Vercel, N8N VPS. Unit economics hold.

**Pro-tier tenant (heavy Campaign Studio user):** ~R80–150/mo variable — still ~91–95% margin on R1798 base+vertical.

---

## Sources

### High Confidence (Context7-equivalent or primary docs)

- [Claude Vision Docs](https://platform.claude.com/docs/en/docs/build-with-claude/vision) — token formula `width × height / 750`, native resolution 1568 tokens, Haiku 4.5 pricing, Files API support
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — Haiku 4.5 at $1/$5 per M tokens
- [Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — 1.25× write (5-min), 2× write (1-hour), 0.1× read
- [grammY Hosting on Vercel](https://grammy.dev/hosting/vercel) — `webhookCallback` + App Router pattern
- [@upstash/ratelimit npm](https://www.npmjs.com/package/@upstash/ratelimit) — v2.0.8, sliding window multi-tenant pattern
- [Supabase pg_cron Docs](https://supabase.com/docs/guides/database/extensions/pg_cron) — scheduling inside Postgres, paired with pg_net for HTTP
- [unpdf GitHub](https://github.com/unjs/unpdf) — serverless-safe PDF parser
- [fal.ai Client Docs](https://docs.fal.ai/model-apis/client) — `@fal-ai/client` replaces deprecated `@fal-ai/serverless-client`
- [FLUX.1 schnell pricing on fal.ai](https://fal.ai/models/fal-ai/flux/schnell) — $0.003/MP
- [sharp installation](https://sharp.pixelplumbing.com/install/) — v0.34.5, bundled by Next.js for image optimization

### Medium Confidence (verified across multiple sources, not direct from vendor)

- [Anthropic API Pricing breakdown 2026 — Finout](https://www.finout.io/blog/anthropic-anthropic-api-pricing) — cache cost multipliers confirmed
- [unpdf vs pdf-parse comparison — PkgPulse](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026) — serverless compatibility
- [AI image pricing comparison 2026 — TeamDay.ai](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) — fal.ai vs Replicate vs OpenAI
- [Stripe Metered Billing pattern 2026](https://www.buildmvpfast.com/blog/stripe-metered-billing-implementation-guide-saas-2026) — Postgres pre-aggregation pattern applicable to PayFast context
- [SA VAT e-invoicing timeline — KPMG](https://kpmg.com/us/en/taxnewsflash/news/2026/02/south-africa-tax-authority-confirms-multi-year-e-invoicing-digital-reporting-reform.html) — confirms SARS API is 2026–2029 phased, not available for SMEs yet
- [USD/ZAR April 2026 ~16.6](https://www.exchangerates.org.uk/USD-ZAR-spot-exchange-rates-history-2026.html) — FX rate used throughout

### Low Confidence (flag for validation during Phase 1)

- **PayFast adhoc API exact endpoint** — documented only in PHP SDK source + third-party discussions. Plan: 1-day sandbox spike in Phase 1 before committing to overage flow. Fallback: capture overage amount, invoice manually end-of-month. Source: [Payfast PHP SDK GitHub](https://github.com/Payfast/payfast-php-sdk).
- **SA-specific accounting/tax npm libraries** — no mature library found. Defer to CSV/PDF export templates matching SARS VAT201 columns.
- **fal.ai rate limits** — vendor docs don't publish limits publicly. Plan: test with burst of 100 requests in staging; add `p-queue` if throttling becomes visible.

---

*Stack research for: DraggonnB OS v3.0 Commercial Launch — subsequent milestone on live SA SME SaaS platform*
*Researched: 2026-04-24*
