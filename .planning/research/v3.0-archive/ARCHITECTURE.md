# Architecture Research — DraggonnB OS v3.0 Commercial Launch

**Domain:** Multi-tenant B2B OS (SA SME vertical) — integration architecture for commercial launch into an existing production platform
**Researched:** 2026-04-24
**Confidence:** HIGH for existing-codebase grounding (read from source), MEDIUM for net-new integration recommendations (reasoned from patterns, not validated against prod traffic)

> **Read-before-you-believe preamble.** Four claims in the milestone context are technically incorrect and I'm correcting them here before design. These materially change the build order.
>
> 1. **`tenant_modules.limits` does not exist.** `tenant_modules` has `config JSONB` only (migration `10_shared_db_foundation.sql` L67–76). Plan limits live in `billing_plans.limits` (migration 11) and usage is tracked in `usage_events` (migration 12). Don't put limits in `tenant_modules`.
> 2. **`agent_sessions.cost_usd` does not exist.** `agent_sessions` has `tokens_used INTEGER` only (migration 05, L118). Cost is not stored per session. If cost monitoring is needed, we add `input_tokens`, `output_tokens`, `cost_zar_cents` columns and compute at insert time — don't assume it's there.
> 3. **`PRICING_TIERS` is not the source of truth.** `lib/payments/payfast.ts` still exports the constant (it's referenced by `app/pricing/page.tsx` L8 and webhook), but migration 11 already created `billing_plans` table and `lib/billing/plans.ts` already reads from it. The constant is legacy and partially dead. The DB catalog exists; the UI hasn't fully migrated.
> 4. **Usage metering is in dual-state.** Legacy `client_usage_metrics` (migration 00) is still written by `lib/billing/subscriptions.ts::handlePaymentComplete()` and read by `lib/tier/feature-gate.ts::checkUsage()` AND `app/(dashboard)/dashboard/page.tsx`. New `usage_events` + `record_usage_event` RPC (migration 12) is available via `lib/usage/meter.ts::recordUsage()`. Both exist. Routes probably use one or the other inconsistently. This is a latent defect that the modular-pricing work will surface.
>
> **Existing assets we're NOT building from scratch:** `billing_plans`, `billing_invoices`, `billing_plan_changes`, `credit_pack_catalog`, `credit_purchases`, `credit_ledger`, `usage_events`, `usage_summaries`, `record_usage_event()`, `get_usage_summary()`, `aggregate_monthly_usage()`, `consume_credits()`, `client_profiles` (with brand_do / brand_dont / brand_values / tone / tagline / content_pillars / USPs), `emitBookingEvent()`, `agent_sessions`, middleware subdomain resolution + module gating, `getUserOrg()`, BaseAgent, 9-step provisioning saga.
>
> **What's missing is integration, composition, UX and enforcement wiring — not foundational schema.**

---

## System Overview (current state + insertion points for v3.0)

```
┌────────────────────────────────────────────────────────────────────────┐
│  EDGE — Vercel + middleware.ts                                         │
│  Wildcard DNS *.draggonnb.online -> subdomain resolver                 │
│  - Resolves tenant via organizations.subdomain (60s in-memory cache)   │
│  - Injects x-tenant-id / x-tenant-tier / x-tenant-modules headers      │
│  - Module route gating (MODULE_ROUTE_MAP) — 403/redirect if not active │
│  ━━━ NEW v3.0: no changes to subdomain logic; add per-route metered   │
│  ━━━          action enforcement via lib/usage/ (not middleware)      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│  APP LAYER — Next.js 14 App Router                                     │
│  - /pricing, /signup, /payment/* (public)                              │
│  - /(dashboard)/* (auth-gated via middleware + getUserOrg())           │
│    ├── /dashboard/[module]           <-- NEW Easy mode                 │
│    └── /dashboard/[module]/advanced  <-- NEW Advanced mode             │
│  - /admin/* (platform admin pages, NEW /admin/cost-monitoring)         │
│  - /api/* (162 routes today)                                           │
│  ━━━ NEW: /api/billing/compose, /api/billing/checkout-cart             │
│  ━━━ NEW: /api/campaigns/*, /api/finance/*, /api/onboarding/day-*      │
│  ━━━ NEW: /api/webhooks/telegram-finance (receipt OCR)                 │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│  LIB LAYER — domain modules (21 today + 4 new)                         │
│                                                                        │
│  EXISTING              NEW v3.0                                        │
│  ───────────────────   ───────────────────────────────────             │
│  lib/billing/*         lib/billing/composition.ts   <-- cart -> order  │
│  lib/usage/*           lib/billing/addons.ts        <-- overage rules  │
│  lib/agents/*          lib/brand/                   <-- voice loader   │
│  lib/content-studio/*  lib/campaigns/               <-- MVP composer   │
│  lib/accommodation/*   lib/finance/knowledge/       <-- SA VAT/SARS    │
│  lib/restaurant/*      lib/accommodation/finance/   <-- vertical wrap  │
│  lib/provisioning/*    lib/restaurant/finance/      <-- vertical wrap  │
│  lib/autopilot/*       lib/onboarding/              <-- 3-day saga     │
│  lib/tier/*            lib/telegram/finance/        <-- receipt intake │
│                                                                        │
│  Shared UI primitives — components/ui (shadcn)                         │
│  ━━━ NEW: components/module-home/ (ModuleHome, AIActionCard, ModeToggle)│
│  ━━━ NEW: components/pricing/ (ModulePicker, AddonPicker, ComposeCart) │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│  DATA — Supabase Postgres (84 tables, RLS-forced)                      │
│  CORE                              v3.0 ADDITIONS                      │
│  ─────────────────────────────    ───────────────────────────────────  │
│  organizations                    +organizations.addon_config JSONB    │
│  organization_users               subscription_composition (NEW)       │
│  module_registry                  billing_addons_catalog (NEW)         │
│  tenant_modules (config JSONB)    brand_voice (NEW, or client_profiles │
│  billing_plans                        extension — see Section "Brand") │
│  billing_invoices                 finance_receipts (NEW)               │
│  usage_events / usage_summaries   campaign_runs (NEW)                  │
│  credit_purchases / credit_ledger onboarding_progress (NEW)            │
│  agent_sessions                   +agent_sessions cost columns (NEW)   │
│  client_profiles (brand voice)    finance_transactions (NEW, shared)   │
│  accommodation_* (30+)            +financial fields on existing tables │
│  restaurant_* / elijah_*                                               │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL — ORCHESTRATION & AI                                         │
│  - N8N (VPS): 17 deterministic workflows (cron, webhooks)              │
│    ━━━ NEW: onboarding-day-1, onboarding-day-2, onboarding-day-3       │
│    ━━━ NEW: cost-rollup-nightly (aggregates agent_sessions)            │
│  - Anthropic Claude API (via BaseAgent): per-call, session-tracked     │
│    ━━━ NEW: prompt cache breakpoint for brand voice system block       │
│  - PayFast (ITN webhook at /api/webhooks/payfast)                      │
│    ━━━ NEW: handle one-off charges for addon purchase + overage top-up │
│  - Telegram Bot API (existing ops bot + NEW finance-receipts bot)      │
│  - Resend (email delivery)                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Component responsibilities (new + modified)

| Component | Kind | Responsibility | Touches |
|-----------|------|----------------|---------|
| `components/module-home/ModuleHome.tsx` | NEW (RSC) | Easy-mode page shell for any module: greeting, 3–5 AI action cards, shortcut tiles, brand ribbon, "Go Advanced" link | `lib/brand/loader.ts`, each module's `getModuleActions()` |
| `components/module-home/AIActionCard.tsx` | NEW (client) | Render one AI-generated action with "Approve / Dismiss / Customize"; calls provided `onApprove`/`onDismiss` | Module API routes |
| `components/module-home/ModeToggle.tsx` | NEW (client) | Persists Easy/Advanced preference to `user_profiles.ui_mode` | `/api/user/preferences` |
| `components/pricing/ModulePicker.tsx` | NEW (client) | Module checkbox grid, recomputes total, shows "conflicts/requires" | `lib/billing/composition.ts` |
| `lib/billing/composition.ts` | NEW | Validate a cart (base plan + modules + addons), compute total, produce `line_items[]` for invoice + PayFast submission | `billing_plans`, `billing_addons_catalog`, `credit_pack_catalog` |
| `lib/billing/addons.ts` | NEW | Read `billing_addons_catalog`, list available addons by category (module, overage, implementation) | |
| `lib/brand/loader.ts` | NEW | `getBrandVoice(orgId)` returns a frozen object `{ tone, brandDo[], brandDont[], taglines[], USPs[], cacheKey }` | `client_profiles` (or new `brand_voice`) |
| `lib/brand/prompt-injector.ts` | NEW | Takes a BaseAgent config + brand voice → returns a `systemBlocks` array with Anthropic prompt-cache breakpoint on the brand block | `@anthropic-ai/sdk` >= 0.27 |
| `lib/campaigns/planner.ts` | NEW | Plan a multi-channel campaign (topic + audience + dates → structured plan) | existing prompt-builder |
| `lib/campaigns/generator.ts` | NEW | Fan out plan → content-studio (email + social) generators | `content-studio/prompt-builder.ts` |
| `lib/campaigns/scheduler.ts` | NEW | Create email campaigns + scheduled social posts; persist `campaign_runs` | `email/*`, `social/*` |
| `lib/campaigns/analytics.ts` | NEW | Aggregate per-campaign metrics | existing analytics tables |
| `lib/finance/knowledge/sa-vat.ts` | NEW | Pure rules: VAT rate (15%), VAT registration thresholds, deemed VAT logic, output/input VAT, tourism levy (1%), TOMS equivalent | — |
| `lib/finance/knowledge/sars-formats.ts` | NEW | Pure formatters: IRP5, VAT201 line definitions, SARS tax invoice requirements (section 20(4) of VAT Act) | — |
| `lib/finance/ledger.ts` | NEW | Generic transaction write/read against `finance_transactions` | |
| `lib/accommodation/finance/` | NEW | Vertical adapter: reads `bookings`, `accommodation_payments`, produces finance transactions | calls `lib/finance/ledger.ts` |
| `lib/restaurant/finance/` | NEW | Vertical adapter: reads `restaurant_orders` (when that module lands), produces finance transactions | calls `lib/finance/ledger.ts` |
| `lib/telegram/finance/receipt-bot.ts` | NEW | Polls/receives photos on finance-receipts bot, stores to `finance_receipts`, calls vision extractor | existing `lib/telegram/bot.ts` |
| `lib/telegram/finance/ocr.ts` | NEW | Claude Haiku 4.5 vision call for receipt → `{ vendor, total, vat, date, line_items[] }` | |
| `lib/onboarding/day-sagas.ts` | NEW | Day-1/2/3 onboarding step orchestrators (not saga-with-rollback — checkpointed linear) | N8N triggers, brand voice, Telegram |
| `lib/usage/middleware-guard.ts` | NEW | Reusable API-route helper: `await guardUsage(orgId, 'ai_generation')` returns Response-or-null | `lib/usage/meter.ts` |
| `scripts/cron/nightly-cost-rollup.ts` | NEW | Aggregate `agent_sessions` + `usage_events` cost → `daily_cost_rollup` table | Vercel cron |

**Modified:**

- `lib/payments/payfast.ts` — add `createPayFastOneOff()` for addon + overage charges alongside existing `createPayFastSubscription()`. Do NOT delete `PRICING_TIERS` yet (still referenced).
- `app/pricing/page.tsx` — full rewrite to composition UI; reads from `lib/billing/plans.ts` + addons.
- `app/api/webhooks/payfast/route.ts` — branch on `item_code` prefix: `DRG-*` (subscription, existing), `ADDON-*` (new module purchase), `TOPUP-*` (credit pack).
- `lib/agents/base-agent.ts` — accept optional `systemBlocks: Array<{type:'text', text:string, cache_control?:...}>` to replace scalar `system: string`. Inject brand voice with cache breakpoint.
- `scripts/provisioning/orchestrator.ts` — add step 10 "schedule-onboarding-followups" after step 08 QA, before step 09 billing.
- `app/(dashboard)/*/page.tsx` for 6+ modules — wrap in `<ModuleHome>` OR redirect to `/advanced`.

---

## Recommended Project Structure (delta from current)

```
C:\Dev\draggonnb-platform\
├── app\(dashboard)\
│   ├── dashboard\                 # /dashboard — Easy landing (ModuleHome aggregate)
│   ├── crm\
│   │   ├── page.tsx               # NEW: Easy mode (<ModuleHome module="crm" />)
│   │   └── advanced\page.tsx      # EXISTING renamed; all current CRM UI lives here
│   ├── email\...                  # same split
│   ├── accommodation\...          # same split (advanced is massive; Easy shows 3 cards)
│   ├── restaurant\...
│   ├── campaigns\                 # NEW
│   │   ├── page.tsx               # Easy: "Generate my week"
│   │   └── advanced\page.tsx      # detailed planner
│   ├── finance\                   # NEW
│   │   ├── page.tsx               # Easy: ledger summary + receipt inbox
│   │   └── advanced\page.tsx      # full VAT register, transactions, exports
│   ├── onboarding\                # EXISTING (landing-page flow); extend for day-1/2/3
│   └── admin\
│       └── cost-monitoring\page.tsx   # NEW (Chris-only, platform_admin guard)
├── app\api\
│   ├── billing\
│   │   ├── compose\route.ts       # NEW POST (validate cart, return computed order)
│   │   ├── checkout-cart\route.ts # NEW POST (create composed subscription + redirect)
│   │   └── addons\route.ts        # NEW GET (list catalog)
│   ├── campaigns\
│   │   ├── plan\route.ts          # NEW POST
│   │   ├── generate\route.ts      # NEW POST
│   │   └── [id]\route.ts
│   ├── finance\
│   │   ├── transactions\route.ts
│   │   ├── vat-register\route.ts
│   │   └── receipts\[id]\route.ts
│   ├── brand\
│   │   └── voice\route.ts         # NEW GET/PUT (onboarding + settings)
│   ├── onboarding\
│   │   ├── day-1\route.ts         # NEW (N8N-triggerable)
│   │   ├── day-2\route.ts
│   │   └── day-3\route.ts
│   ├── user\
│   │   └── preferences\route.ts   # NEW PUT ui_mode
│   └── webhooks\
│       ├── payfast\route.ts       # MODIFIED (item_code branching)
│       └── telegram-finance\route.ts  # NEW
├── lib\
│   ├── billing\
│   │   ├── plans.ts               # EXISTING
│   │   ├── subscriptions.ts       # EXISTING
│   │   ├── invoices.ts            # EXISTING
│   │   ├── credits.ts             # EXISTING
│   │   ├── composition.ts         # NEW
│   │   └── addons.ts              # NEW
│   ├── brand\                     # NEW
│   │   ├── loader.ts
│   │   ├── prompt-injector.ts
│   │   └── types.ts
│   ├── campaigns\                 # NEW
│   │   ├── planner.ts
│   │   ├── generator.ts
│   │   ├── scheduler.ts
│   │   ├── analytics.ts
│   │   └── types.ts
│   ├── finance\                   # NEW
│   │   ├── knowledge\
│   │   │   ├── sa-vat.ts
│   │   │   ├── sa-tourism-levy.ts
│   │   │   ├── sars-formats.ts
│   │   │   └── index.ts
│   │   ├── ledger.ts
│   │   └── types.ts
│   ├── accommodation\finance\     # NEW (vertical adapter)
│   ├── restaurant\finance\        # NEW (vertical adapter)
│   ├── onboarding\                # NEW
│   │   ├── day-sagas.ts
│   │   ├── steps\
│   │   │   ├── send-welcome-email.ts
│   │   │   ├── capture-brand-voice.ts
│   │   │   ├── seed-first-campaign.ts
│   │   │   └── generate-starter-content.ts
│   │   └── types.ts
│   ├── telegram\finance\          # NEW
│   │   ├── receipt-bot.ts
│   │   └── ocr.ts
│   ├── usage\
│   │   ├── meter.ts               # EXISTING
│   │   ├── limits.ts              # EXISTING
│   │   └── middleware-guard.ts    # NEW
│   └── agents\
│       └── base-agent.ts          # MODIFIED (systemBlocks + cache)
├── components\
│   ├── module-home\               # NEW
│   │   ├── ModuleHome.tsx
│   │   ├── AIActionCard.tsx
│   │   ├── ModeToggle.tsx
│   │   └── ShortcutTile.tsx
│   ├── pricing\                   # NEW
│   │   ├── ModulePicker.tsx
│   │   ├── AddonPicker.tsx
│   │   ├── ComposeCart.tsx
│   │   └── PriceBreakdown.tsx
│   └── landing\                   # MODIFIED (site redesign)
├── scripts\
│   ├── cron\
│   │   └── nightly-cost-rollup.ts # NEW (Vercel cron target)
│   └── provisioning\steps\
│       └── 10-schedule-onboarding.ts  # NEW
└── supabase\migrations\
    ├── 22_billing_composition.sql     # NEW
    ├── 23_brand_voice.sql             # NEW (if we don't reuse client_profiles)
    ├── 24_finance_core.sql            # NEW
    ├── 25_finance_receipts.sql        # NEW
    ├── 26_campaign_runs.sql           # NEW
    ├── 27_onboarding_progress.sql     # NEW
    ├── 28_agent_cost_columns.sql      # NEW (ALTER agent_sessions)
    └── 29_daily_cost_rollup.sql       # NEW
```

### Structure rationale

- **`/dashboard/[module]` vs `/dashboard/[module]/advanced` split (Option A — recommended).** Beats query-string toggle for three reasons: (1) each mode is a different React tree and a different auth/data shape — Easy mode pulls only 3–5 AI cards, Advanced pulls entire CRUD — mixing in one file forces client-component-with-swr, killing RSC speed; (2) URLs are shareable and bookmarkable, which matters for handover to a team member who wants the advanced view without flipping a setting; (3) no conditional-rendering bloat. Con: duplicated nav/layout — mitigated by shared `(dashboard)/layout.tsx`. User's default mode persisted in `user_profiles.ui_mode` drives redirect from `/dashboard/crm` → `/dashboard/crm/advanced` if preference is "advanced". The `ModeToggle` button flips preference AND navigates.
- **`lib/brand/`** is isolated because four different consumers need it (content-studio, 4 agents, campaigns, onboarding). Making it a sibling of `lib/agents/` (not nested under any) keeps it DI-friendly.
- **`lib/finance/knowledge/`** is pure functions + constants, zero Supabase imports. This means it's trivially unit-testable and future-importable from Restaurant/Accommodation adapters without circular deps.
- **`lib/{accommodation,restaurant}/finance/`** are thin (~200 LOC) adapters. They read module-specific tables and emit generic `FinanceTransaction` rows. The generic ledger knows nothing about bookings/orders.

---

## Architectural Patterns

### Pattern 1: Composable Billing (subscription + addons + overage)

**What:** Order = (base plan) + (selected modules) + (overage credit packs). Persisted as a per-org composition row + an invoice with line items.

**Schema recommendation (cleanest given existing tables):**

```sql
-- NEW: 22_billing_composition.sql
CREATE TABLE billing_addons_catalog (
  id TEXT PRIMARY KEY,                        -- 'addon-accommodation', 'addon-restaurant', 'addon-finance-ai'
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('module','implementation','overage_pack')),
  module_id TEXT REFERENCES module_registry(id),  -- NULL for non-module addons
  price_zar INTEGER NOT NULL,                 -- cents; recurring for 'module', one-off for 'implementation'/'overage_pack'
  billing_kind TEXT NOT NULL CHECK (billing_kind IN ('recurring','one_off')),
  min_plan_id TEXT REFERENCES billing_plans(id),  -- e.g. restaurant requires growth
  payfast_item_code TEXT UNIQUE,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE subscription_composition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  base_plan_id TEXT NOT NULL REFERENCES billing_plans(id),
  active_addons TEXT[] NOT NULL DEFAULT '{}',  -- array of billing_addons_catalog.id for 'module' kind
  monthly_total_zar INTEGER NOT NULL,           -- denormalized cache; recomputed on change
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Why NOT a single `subscriptions` table with line items:**

- An entity-with-line-items model conflates three different billing behaviours: base plan recurs, module addons recur (but independently toggleable), and overage packs are one-off. Treating them uniformly forces a `subscription_item_kind` discriminator that every downstream query then has to filter on.
- Existing `billing_invoices` already uses `line_items JSONB` — that's the right place for compositional detail *at the moment of billing*. The org's *current state* is better modeled as `subscription_composition` (one row per org).
- `credit_purchases` already handles overage packs — don't duplicate.

**PayFast coexistence (one-off alongside recurring):**

PayFast has two modes: subscription-type-1 (recurring) for the monthly base+modules, and one-off (subscription-type-6 or plain checkout) for overage top-ups and implementation fees. Recommended:

```
Base + Modules (recurring)  → single PayFast subscription, amount = monthly_total_zar
Implementation fee (one-off) → separate PayFast one-off at signup (m_payment_id prefixed ONEOFF-)
Overage top-up (one-off)    → separate PayFast one-off ad-hoc (m_payment_id prefixed TOPUP-)
```

The `app/api/webhooks/payfast/route.ts` branches on `m_payment_id` prefix. Each line item type maps to a distinct handler: `handleSubscriptionPayment()`, `handleImplementationPayment()`, `handleTopupPayment()`. All three write to `billing_invoices` (`line_items[]`) and `subscription_history`.

**When to use:** Any v3.0 tenant. Existing tenants keep `plan_id` (exists already) and get a `subscription_composition` row auto-created on first login post-migration with `active_addons = []` — see Migration Strategy below.

**Trade-offs:**

- (+) Additive to existing schema. `billing_plans`, `billing_invoices`, `credit_*` all unchanged.
- (+) Existing PayFast flow untouched for base plan; one-off routing is additive.
- (−) `monthly_total_zar` denormalization requires trigger or app-level recompute on addon toggle. Recommended: app-level, use DB constraint `CHECK monthly_total_zar >= 0`.
- (−) Requires PayFast subscription *amendment* when a tenant adds a module mid-cycle. PayFast supports amending via their `/subscriptions/{token}/adhoc` or cancel-and-recreate. Use cancel-and-recreate — it's proven in `lib/billing/subscriptions.ts::cancelPayFastSubscription()`.

### Pattern 2: ModuleHome + AI-action-card (declarative config, not callbacks)

**What:** A server component that any module's Easy page uses as its entire body. Consumers pass a declarative manifest, not callbacks.

**Why declarative, not callbacks:**

- Callbacks with `getActions: () => Promise<Action[]>` force `ModuleHome` to be a client component (to invoke the callback on interaction) or force awkward RSC-passing-RSC (which Next.js 14 doesn't cleanly support for user-land functions).
- A manifest pattern keeps `ModuleHome` as RSC, fetches actions server-side in parallel, and streams the card UI. Each card is a client island only for the approve/dismiss button.
- Manifest is re-usable: the same `module: 'crm'` manifest can drive the module-home aggregator on `/dashboard` (which renders mini-versions of each module's card set).

**Recommended API:**

```typescript
// lib/module-home/manifests/crm.ts
import type { ModuleHomeManifest } from '@/lib/module-home/types'

export const crmManifest: ModuleHomeManifest = {
  moduleId: 'crm',
  title: 'CRM',
  greeting: (org) => `Hi ${org.name}, here's what needs attention in your pipeline.`,
  getActions: async (ctx) => {
    // runs server-side in the RSC render; ctx = { orgId, userId, brand }
    return [
      {
        id: 'follow-up-cold-leads',
        kind: 'ai_suggestion',
        title: '7 leads went cold. Send a re-engagement email.',
        detail: 'Last contact > 14 days ago. Draft email preview available.',
        approveAction: '/api/crm/actions/re-engage-cold',
        dismissAction: '/api/crm/actions/dismiss?id=follow-up-cold-leads',
        previewAction: '/api/crm/actions/preview?id=follow-up-cold-leads',
      },
      // ...
    ]
  },
  shortcuts: [
    { label: 'Add contact', href: '/dashboard/crm/advanced?action=new-contact' },
    { label: 'View pipeline', href: '/dashboard/crm/advanced' },
  ],
}
```

```typescript
// app/(dashboard)/crm/page.tsx
import { ModuleHome } from '@/components/module-home/ModuleHome'
import { crmManifest } from '@/lib/module-home/manifests/crm'

export default function CrmHomePage() {
  return <ModuleHome manifest={crmManifest} />
}
```

**Action source — agent vs cached vs event-driven (decision matrix):**

| Action freshness need | Source | Example |
|---|---|---|
| "Right now" reactive | event-driven (query existing tables, compute in `getActions`) | "3 bookings need check-in prep today" |
| Daily/weekly "suggestion" | cached from nightly N8N run → `module_home_suggestions` table | "Your best-performing post last week was X. Repeat it?" |
| On-demand AI generation | BaseAgent call, triggered by user click (NOT in `getActions`) | "Draft 3 options for this re-engagement email" |

Per-render BaseAgent calls in `getActions` would be per-page-load and too expensive. Suggestions cache nightly or weekly. Server-side queries for reactive items are fine (sub-100ms against indexed tables).

**Trade-offs:**

- (+) RSC-first, zero client-side fetch on initial paint for action list.
- (+) Every module has the same shape; onboarding can programmatically list "set up your CRM home" by iterating manifests.
- (−) Action cards can't easily share state across the page (e.g. "I already approved this, dim the next one"). That's fine at MVP — treat each card as independent.

### Pattern 3: Brand voice as cached system block

**What:** Brand voice is loaded once per request, injected as a separate system content block with Anthropic cache control, so the first request for each tenant after cache-warm pays ~1/10th the tokens for brand context. Cache persists ~5 min.

**Storage recommendation: extend `client_profiles` (existing), do NOT create new `brand_voice` table.**

`client_profiles` already has `tone`, `brand_do[]`, `brand_dont[]`, `brand_values[]`, `tagline`, `content_pillars[]`, `unique_selling_points[]`. This is brand voice — already org-scoped, already RLS-protected, already surfaced in autopilot UI. Creating a new table is duplication. Add any missing fields (`example_phrases TEXT[]`, `forbidden_topics TEXT[]`) via `ALTER TABLE` in `23_brand_voice.sql`.

**NOT in `tenant_modules.config`:** JSONB is right for per-module config (e.g. accommodation property types, restaurant table count) — values that are the *module's* config. Brand voice is cross-cutting and should be a first-class row.

**Injection pattern:**

```typescript
// lib/brand/prompt-injector.ts
import type Anthropic from '@anthropic-ai/sdk'

export async function buildSystemBlocks(
  orgId: string,
  taskSystemPrompt: string,
): Promise<Anthropic.TextBlockParam[]> {
  const brand = await getBrandVoice(orgId)
  return [
    {
      type: 'text',
      text: brand.toSystemText(),        // stable per tenant; long-ish
      cache_control: { type: 'ephemeral' },  // <-- 5min cache, savings compound across calls
    },
    {
      type: 'text',
      text: taskSystemPrompt,            // varies per agent / per task
    },
  ]
}
```

Anthropic caches entries in order up to the last `cache_control` breakpoint. Brand voice first → stable → cached. Task prompt second → varies → not cached. Every subsequent call from the same tenant within 5 min reads the brand context from cache at 10% of the token cost.

**Trade-off — cache eviction:** When tenant edits brand voice, their cache entries become stale. Anthropic doesn't expose cache invalidation, so we rely on natural 5-min TTL. For the first ~5 min after an edit, mixed content generation could use stale voice. Acceptable (brand voice changes rarely). If it matters, we append a `v:${updated_at}` marker to force a cache miss.

### Pattern 4: Usage enforcement via DB RPC (not middleware)

**What:** Metered action enforcement happens at API-route level via the already-built `record_usage_event` RPC, not in `middleware.ts`.

**Why not middleware:**

- Middleware runs on every request (including images, static assets, health probes). Running a DB write per-request is a bad idea at any scale.
- Middleware can't distinguish "the user viewed the content generator page" from "the user clicked generate". Only the endpoint knows the action is metered.
- `middleware.ts` is already the tightest bottleneck in our request path; adding usage-check latency there would regress every API call.

**Recommended pattern — route-level guard:**

```typescript
// lib/usage/middleware-guard.ts
import { recordUsage } from './meter'
export async function guardUsage(
  orgId: string,
  metric: UsageMetric,
  quantity = 1,
): Promise<Response | null> {
  const { data, error } = await recordUsage(orgId, metric, quantity)
  if (error) return Response.json({ error: 'Usage check failed' }, { status: 500 })
  if (!data?.allowed) {
    return Response.json(
      { error: 'Usage limit reached', metric, current: data?.current, limit: data?.limit },
      { status: 429, headers: { 'Retry-After': '86400' } },
    )
  }
  return null  // allowed
}

// in an API route:
const denied = await guardUsage(orgId, 'ai_generation')
if (denied) return denied
// ... do the work
```

The existing `record_usage_event` RPC is atomic (check + insert in a single `plpgsql` block with a SELECT ... FROM usage_events summing current, then branching). No lost writes at low concurrency. At SA SME scale this is comfortably sufficient.

**Counter storage recommendation:** Keep `usage_events` as the source of truth (append-only event log, already exists). Don't move to Redis. Reasons:
- Durability matters — a lost "email sent" event means free email sends for that tenant, which is revenue leakage.
- Per-tenant concurrency is low (10s/min at most). Postgres handles the INSERT load trivially.
- `get_usage_summary` RPC caches well at the RPC level if we wrap it; right now it does a sum on a properly-indexed table (`idx_usage_events_org_metric`).
- If per-tenant traffic ever spikes to 1000s/min (unlikely at current scale), partition `usage_events` by month and optionally add a Redis-backed counter cache in front.

**Validated as recommended in the question — Postgres row UPSERT.** The existing `record_usage_event` RPC is the UPSERT equivalent (atomic check-and-insert). Nothing to add.

### Pattern 5: Cost monitoring (nightly aggregation)

**What:** Nightly Vercel cron calls an `/api/ops/cost-rollup` route which aggregates `agent_sessions` and `usage_events` into a `daily_cost_rollup` table.

**Schema:**

```sql
-- NEW: 28_agent_cost_columns.sql
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_zar_cents INTEGER DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS model TEXT;

-- NEW: 29_daily_cost_rollup.sql
CREATE TABLE daily_cost_rollup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  agent_invocations INTEGER DEFAULT 0,
  ai_tokens_input BIGINT DEFAULT 0,
  ai_tokens_output BIGINT DEFAULT 0,
  ai_tokens_cache_read BIGINT DEFAULT 0,
  ai_cost_zar_cents BIGINT DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  social_posts INTEGER DEFAULT 0,
  plan_monthly_zar_cents INTEGER DEFAULT 0,  -- denormalized for fast margin calc
  UNIQUE(organization_id, day)
);
```

`base-agent.ts::run()` captures `response.usage` (input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens), computes cost from Sonnet 4.5 published pricing (ZAR-converted at config-time rate), and writes the columns per session. Nightly job UPSERTs into `daily_cost_rollup`.

**Cron choice: Vercel cron, NOT Supabase Edge Functions, NOT N8N.** Reasons:
- Vercel cron: free up to 2 schedules, deploys with the code, runs in the same environment as the rest of the app (same env vars, same lib imports, same tests). One-line `vercel.json`.
- Supabase Edge Functions: requires separate TypeScript bundling target (Deno), separate deploy, separate test setup. Cost-monitoring logic needs to import `lib/billing/plans.ts` — painful across that boundary.
- N8N: possible, but N8N is VPS-hosted and stateful. Cost rollup should be a pure function of the DB and should not depend on external infra being up.

**`/admin/cost-monitoring` page:** Server component, queries `daily_cost_rollup` + `subscription_composition`. Shows per-tenant: last 30 days of cost vs revenue, margin %, trending tenants. Guard: `role: 'platform_admin'` in `organization_users` (pattern already used in `/admin/clients`).

### Pattern 6: Vertical finance adapters over shared knowledge

**What:** Pure SA tax/VAT/levy logic in `lib/finance/knowledge/`, vertical-specific wrappers in `lib/{accommodation,restaurant}/finance/`.

**Data contract between shared and vertical:**

```typescript
// lib/finance/types.ts
export interface FinanceTransaction {
  id?: string
  organization_id: string
  occurred_at: string
  kind: 'sale' | 'refund' | 'expense' | 'levy' | 'vat_output' | 'vat_input'
  source_module: 'accommodation' | 'restaurant' | 'manual' | 'receipt'
  source_ref: string                 // e.g. bookingId, orderId, receiptId
  gross_zar_cents: number
  vat_zar_cents: number              // 0 if not registered
  net_zar_cents: number
  vat_rate: number                   // 0.15 default, 0 for exempt
  tourism_levy_cents: number         // 1% for accommodation only
  counterparty: string | null
  memo: string | null
  ledger_account: string             // e.g. 'sales.accommodation', 'vat.output'
  is_posted: boolean                 // vs draft
  metadata: Record<string, unknown>
}

// lib/finance/ledger.ts
export async function postTransaction(tx: FinanceTransaction): Promise<...>
export async function listTransactions(orgId, filters): Promise<FinanceTransaction[]>
export async function generateVatRegister(orgId, periodStart, periodEnd): Promise<VatRegister>

// lib/finance/knowledge/sa-vat.ts  (pure functions)
export function applyVat(netCents: number, rate: number): { vat: number, gross: number }
export function extractVatFromGross(grossCents: number, rate: number): { vat: number, net: number }
export function vatRegistrationRequired(annualTurnoverCents: number): boolean
export const SA_VAT_STANDARD = 0.15
export const SA_TOURISM_LEVY = 0.01
```

Vertical wrappers only call `postTransaction()` with correctly-shaped data derived from their own tables:

```typescript
// lib/accommodation/finance/booking-to-transactions.ts
import { postTransaction } from '@/lib/finance/ledger'
import { extractVatFromGross, SA_VAT_STANDARD, SA_TOURISM_LEVY } from '@/lib/finance/knowledge/sa-vat'

export async function postBookingRevenue(booking, org) {
  const { vat, net } = extractVatFromGross(booking.total_cents, SA_VAT_STANDARD)
  const levyCents = Math.round(net * SA_TOURISM_LEVY)
  await postTransaction({
    organization_id: org.id,
    occurred_at: booking.check_out_date,
    kind: 'sale',
    source_module: 'accommodation',
    source_ref: booking.id,
    gross_zar_cents: booking.total_cents,
    vat_zar_cents: org.is_vat_registered ? vat : 0,
    net_zar_cents: net,
    vat_rate: org.is_vat_registered ? SA_VAT_STANDARD : 0,
    tourism_levy_cents: levyCents,
    counterparty: booking.guest.full_name,
    memo: `Stay ${booking.check_in_date} – ${booking.check_out_date}`,
    ledger_account: 'sales.accommodation',
    is_posted: true,
    metadata: { booking_id: booking.id, nights: booking.nights },
  })
}
```

**Where it gets called:** Hook into `emitBookingEvent('booking_confirmed' | 'payment_received')` — adds a new subscriber that writes the finance transaction. Zero changes to accommodation business logic — just a new subscriber on the existing dispatcher.

**Trade-off:** The shared `ledger_account` string is a convention, not a strict enum. That's intentional — verticals can introduce their own account codes (`sales.accommodation`, `sales.restaurant.dinein`, `sales.restaurant.takeaway`) without schema migration. The reporting view (`lib/finance/knowledge/sars-formats.ts::vat201Mapping`) is where the convention becomes a contract.

---

## Data Flow — non-obvious flows

### 1. Composed-plan signup (from /pricing to first login)

```
User on /pricing
  |  picks base plan (Growth) + modules (Accommodation, Finance-AI) + implementation fee
  |  client-side: ModulePicker maintains { base, modules[], oneOffs[] }
  v
Click "Continue"
  |
  |  POST /api/billing/compose { base, modules, oneOffs }
  |    |-> lib/billing/composition.ts::validateAndPrice()
  |    |    - validates min_plan_id constraints (Restaurant requires Growth)
  |    |    - computes monthly_total_zar, one_off_total_zar
  |    |    - returns { line_items[], monthly_total, one_off_total, signup_url }
  |    v
  |  POST /api/billing/checkout-cart
  |    |-> lib/billing/composition.ts::createPendingOrder()
  |    |    - creates organization row (subscription_status='pending')
  |    |    - creates subscription_composition row
  |    |    - creates billing_invoices row (status='draft')
  |    |    - returns 2 PayFast submissions: subscription + one_off
  v
Browser redirects to PayFast subscription page (monthly base+modules)
  |
  |  On success -> /payment/success?step=subscription
  |  On ITN webhook -> /api/webhooks/payfast (item_code=DRG-GROWTH)
  |    |-> handleSubscriptionPayment(orgId, itn)
  |    |    - lib/billing/subscriptions.ts::handlePaymentComplete()
  |    |    - subscription_status = 'active'
  |    |    - if one-off needed: redirect to 2nd PayFast for implementation fee
  v
If implementation one-off payment present:
  |  Browser redirects to PayFast one-off page
  |  ITN webhook -> handleImplementationPayment (item_code=ADDON-IMPLEMENTATION)
  |    - billing_invoices.status = 'paid'
  v
Post-payment webhook completion triggers provisioning:
  |-> scripts/provisioning/orchestrator.ts (existing 9 steps)
  |-> NEW step 10: schedule-onboarding-followups
  |     - INSERT onboarding_progress (org_id, day_1_scheduled_at=now()+1d, ...)
  |     - N8N webhook to schedule day-1, day-2, day-3 touches
  v
User redirected to /onboarding wizard (existing page)
  - Captures brand voice (writes client_profiles)
  - 14-day trial starts; subscription is active but first charge deferred
```

### 2. Brand voice injection into agent calls (with cache hit)

```
API route /api/content/generate
  |
  |-> loads brand voice (lib/brand/loader.ts::getBrandVoice(orgId))
  |     - SELECT from client_profiles
  |     - freezes into BrandVoice object with stable .toSystemText() output
  v
  |-> BaseAgent.run({ input, context })
  |     |
  |     |-> systemBlocks = buildSystemBlocks(orgId, this.config.systemPrompt)
  |     |     = [
  |     |       { type:'text', text: brand.toSystemText(), cache_control:{type:'ephemeral'} },
  |     |       { type:'text', text: this.config.systemPrompt }
  |     |     ]
  |     |
  |     |-> anthropic.messages.create({ system: systemBlocks, messages, model, ... })
  v
Response arrives with usage.cache_read_input_tokens (hit) or cache_creation_input_tokens (miss)
  |
  |-> base-agent.ts computes cost_zar_cents from token breakdown + ZAR/USD rate
  |-> writes agent_sessions with cost columns
```

**First call per tenant per 5min:** cache miss, writes ~500 tokens of brand context to cache. Pays full rate.
**Subsequent calls within 5min:** cache hit on brand block. Pays 10% rate on those tokens. For a tenant generating 10 posts in a burst, savings are ~4,500 tokens × 90% = ~$0.01 per burst, but compounded across all tenants + all agents, materially reduces monthly AI spend.

### 3. Telegram finance receipt flow

```
User snaps receipt, sends to @DraggonnBFinanceBot (new bot, not ops bot)
  |
  v
Telegram webhook -> /api/webhooks/telegram-finance
  |-> verify sender is authorized user (telegram_user_id in user_profiles)
  |-> download photo from Telegram file API
  |-> INSERT finance_receipts (org_id, photo_url, status='pending', submitted_by=user_id)
  |-> return 200 immediately; process async via background
  v
Async (Vercel waitUntil) -> lib/telegram/finance/ocr.ts::extractReceipt()
  |-> anthropic.messages.create({
  |     model: 'claude-haiku-4-5-20251022',
  |     messages: [{ role:'user', content:[{type:'image', source:...}, {type:'text', text:EXTRACT_PROMPT}] }]
  |   })
  |-> parse JSON { vendor, total_cents, vat_cents, date, line_items[] }
  |-> UPDATE finance_receipts SET status='extracted', extracted_data=...
  v
Bot replies to user: "Got it. R432 at Woolies, 2026-04-24. VAT R56.30. Correct? [Yes] [Edit]"
  |-> user taps Yes
  v
Bot -> /api/finance/receipts/{id}/confirm
  |-> lib/finance/ledger.ts::postTransaction({
  |     kind:'expense', source_module:'receipt', source_ref:receiptId,
  |     gross_zar_cents:total, vat_zar_cents:vat, ...
  |   })
  |-> updates finance_receipts.status='posted'
  |-> returns "Logged. See /finance"
```

### 4. Usage enforcement + overage top-up

```
API route /api/email/send
  |
  |-> guardUsage(orgId, 'email_send', recipientCount)
  |   |-> supabase.rpc('record_usage_event', {...})
  |   |   - SELECT SUM(quantity) FROM usage_events WHERE org+metric+this_month
  |   |   - if current+quantity <= limit: INSERT event; return { allowed:true }
  |   |   - if over limit:
  |   |     |-> tryConsumeCredits(org, metric, quantity)  (existing fallback)
  |   |     |   - SELECT FROM credit_purchases WHERE credits_remaining > 0 ORDER BY purchased_at
  |   |     |   - UPDATE credits_remaining, INSERT credit_ledger row
  |   |     |   - returns { consumed:true } if credits present
  |   |     |-> returns { allowed:true, source:'credit_pack' }
  |   |   - else return { allowed:false, reason:'limit_reached', upgradeRequired, packsAvailable }
  v
If allowed -> proceed with Resend send
If denied -> 429 response with { packsAvailable[] } -> frontend shows "Buy top-up" modal
  |-> POST /api/billing/checkout-cart { oneOffs:['emails-20k'] }
  |-> PayFast one-off page (TOPUP-EMAILS-20K)
  |-> ITN: handleTopupPayment -> lib/billing/credits.ts::purchasePack()
  |   - INSERT credit_purchases (credits_purchased=20000, credits_remaining=20000)
  |-> user retries send; now credit pack fallback allows
```

---

## Integration Points

### External services

| Service | Integration | Notes / gotchas |
|---|---|---|
| PayFast | `lib/payments/payfast.ts` (existing); webhook at `/api/webhooks/payfast` | Branch webhook on `m_payment_id` prefix. Recurring amendment == cancel-and-recreate. Signature MD5 already validated. |
| Anthropic (via BaseAgent) | `lib/agents/base-agent.ts` (modified for `systemBlocks`) | Prompt caching requires SDK that sends `system: TextBlockParam[]`. Current SDK does. No breaking change to existing agents — pass-through. |
| Anthropic vision (Haiku 4.5) | `lib/telegram/finance/ocr.ts` (new) | Image size limit 5MB. Telegram may return 10MB photos — compress client-side via `sharp` in webhook handler. |
| Telegram Bot API | existing `lib/telegram/bot.ts` + new `lib/telegram/finance/receipt-bot.ts` | New bot token required. Separate webhook route so ops-bot and finance-bot don't share state. |
| N8N | existing orchestrator; 3 new workflows | Use existing `wf-queue.json` template pattern. Webhook endpoints already follow `/api/*` convention. |
| Resend | existing `lib/email/resend.ts` | No changes needed for campaigns — campaigns call existing email campaign send. |
| Vercel cron | `vercel.json` cron entry pointing at `/api/ops/cost-rollup` | Limit to 2 crons on hobby tier. If we're already using 2, move to scheduled N8N. |

### Internal boundaries

| Boundary | Communication | Notes |
|---|---|---|
| Campaigns ↔ content-studio | direct function call (`campaigns/generator.ts` imports `content-studio/prompt-builder.ts`) | No HTTP hop. Content studio stays as lib; campaigns composes it. |
| Campaigns ↔ social/email | direct function call | Reuse existing schedulers. Campaign just owns the `campaign_runs` row grouping. |
| Accommodation ↔ finance | subscriber on `emitBookingEvent` | Decoupled; accommodation doesn't import finance. Finance registers as a listener. |
| Onboarding ↔ provisioning | `scripts/provisioning/orchestrator.ts` calls new step 10 which enqueues N8N | Onboarding saga is NOT a rollback saga (no compensating actions for "user read email"); it's a linear checkpointed progress tracker. Different pattern from provisioning saga. Acknowledge this in docs to avoid confusion. |
| BaseAgent ↔ brand | BaseAgent optionally accepts `brandContext` param; if present, builds systemBlocks | Existing agent call sites don't need changes; new callers pass brandContext. |
| ModuleHome ↔ module API | declarative manifest reads module API routes (existing auth/data) | No new auth — reuses `getUserOrg()` via the API it calls. |

---

## Scaling Considerations

| Scale | Architecture adjustments |
|---|---|
| 0–50 tenants (now → end of sprint 2) | Current architecture is fine. `usage_events` sums per-query; fine at low row counts. |
| 50–500 tenants | Partition `usage_events` by month (hinted in migration 12 comment). Add materialized view for `get_usage_summary` keyed on `(org_id, month)`, refresh nightly. |
| 500+ tenants | Consider read replica for analytics/admin queries. Introduce Redis cache in front of `get_usage_summary` (invalidate on `record_usage_event` write). Partition `agent_sessions` by month. |

**First bottleneck (most likely):** `middleware.ts` `resolveTenant()` with 60s in-memory cache — memory is per-Vercel-function-instance. On cold-start bursts, every instance re-queries. If tenant count > 100 and traffic is bursty, move to shared Redis cache. Low priority at current scale.

**Second bottleneck:** `get_usage_summary` RPC iterates every metric in `billing_plans.limits` JSONB — fine at 4 metrics, breaks if we grow to 40. Mitigation: materialized view.

---

## Anti-Patterns (domain-specific)

### Anti-Pattern 1: "Migrate pricing constants into the DB by deleting the constant"

**What people do:** Delete `PRICING_TIERS` from `lib/payments/payfast.ts` and replace every import with `lib/billing/plans.ts::getPlans()`.

**Why it's wrong:** Any code path that runs outside a request context (scripts, CLI, build-time) can't call `createClient()` to read the DB. `app/pricing/page.tsx` is a client component that needs the tier list at static-generation time. Ripping the constant breaks these.

**Do this instead:** Keep `PRICING_TIERS` as a build-time seed that mirrors `billing_plans` content. Add an assertion test (`__tests__/billing/pricing-tiers-sync.test.ts`) that fails CI if the constant drifts from the DB. For all *runtime* use, migrate to `getPlans()`. Delete the constant only when it has zero imports.

### Anti-Pattern 2: Putting brand voice in every prompt verbatim

**What people do:** Append `[brand_do: ..., brand_dont: ...]` to every user message in every agent.

**Why it's wrong:** Doubles the input token cost on every call. Hurts prompt-cache hit rate (the context changes subtly per-call and busts the cache).

**Do this instead:** Brand voice in a separate system block with `cache_control: { type: 'ephemeral' }` (see Pattern 3).

### Anti-Pattern 3: Usage-check race condition via read-then-write

**What people do:**
```typescript
const usage = await supabase.from('usage').select('count')
if (usage.count < limit) {
  await supabase.from('usage').update({ count: usage.count + 1 })
  // do work
}
```

**Why it's wrong:** Two concurrent requests both read count=999, both write 1000, limit 1000 permits both, tenant gets two free ops. At SA SME scale this is rare, but it's revenue leakage and it's fixable.

**Do this instead:** Use the already-built `record_usage_event` RPC, which does check+insert in a single `plpgsql` block (atomic at the transaction level). Or, if you must write app-level, use a CTE: `WITH c AS (SELECT COUNT(*) FROM usage_events WHERE ...) INSERT INTO usage_events SELECT ... WHERE (SELECT COUNT(*) FROM c) < $limit RETURNING *`. Returns zero rows if denied.

### Anti-Pattern 4: Making Easy mode a cut-down version of Advanced (same route, hidden sections)

**What people do:** One page with `if (mode === 'easy') hide(complicatedSection)`.

**Why it's wrong:** Forces client-component-with-state. Kills RSC speed. Makes every section conditional-render. Designer's Easy mock has different *information architecture* from Advanced — it's not just fewer controls, it's different IA.

**Do this instead:** Two routes, two trees. Shared primitives (Card, Button) via `components/ui`. Shared data fetchers (`lib/crm/queries.ts`) but different selection per mode. Link between them.

### Anti-Pattern 5: Onboarding as a saga-with-rollback

**What people do:** Treat day-1/day-2/day-3 as a saga with compensating rollback actions.

**Why it's wrong:** "Send welcome email" has no reasonable compensating action. "User opened onboarding wizard" has no reasonable compensating action. Saga-rollback is for transactional resource creation (what `scripts/provisioning/` does for Supabase + GitHub + Vercel + N8N), not for temporal user journeys.

**Do this instead:** Linear checkpointed progress tracker. Each step writes to `onboarding_progress` with `{step_key, completed_at, skipped, result_json}`. Steps are idempotent. If a step fails, retry it or skip; don't undo prior steps.

---

## Suggested Build Order (4 sprints, paying client by end of Sprint 2)

Ordering is dominated by three constraints:
1. **Revenue unlock** — paying-client target is end of sprint 2, so modular billing + a working signup flow must land by mid-sprint 2.
2. **Dependencies** — brand voice blocks Campaigns and ModuleHome quality; usage enforcement blocks safe onboarding of new tenants; finance-AI needs vertical adapters.
3. **Risk containment** — migrations that touch existing tenants (organizations, pricing) go first so we have maximum sprint runway to catch regressions in the 583 test suite.

### Sprint 1 (Weeks 1–2) — "Foundations that unlock revenue"

**Theme:** Ship the billing composition + signup flow. Land usage enforcement. Don't touch UI yet.

| Order | Item | Rationale | Risk |
|---|---|---|---|
| 1.1 | Migration `22_billing_composition.sql` (catalog + composition tables) | Additive, zero impact on existing tenants | Low. Test: existing `/pricing` and `/payment/success` still pass. |
| 1.2 | Migration `28_agent_cost_columns.sql` (ALTER agent_sessions) | Needed before new agents run; defaults to 0 so existing sessions aren't broken | Low. Backfill `model` column later. |
| 1.3 | `lib/billing/composition.ts` + `lib/billing/addons.ts` + tests | Pure logic, testable in isolation | Low. 15+ new unit tests. |
| 1.4 | `/api/billing/compose` + `/api/billing/checkout-cart` + PayFast webhook branching | API surface for new signup | Med. Webhook branching must be backwards-compatible with existing `DRG-*` items. |
| 1.5 | `components/pricing/*` + rewrite `app/pricing/page.tsx` + `app/signup/page.tsx` updates | User-visible | Med. Visual regression risk — snapshot tests. |
| 1.6 | `lib/usage/middleware-guard.ts` + wire into top 5 metered routes (ai/generate, email/send, social/publish, agent/run, content/generate) | Caps usage before we take money | Low. RPC already exists. |
| 1.7 | E2E test: full signup of a new composed tenant | Confirms end-to-end | Critical path. |

**Exit criteria:** a test tenant can sign up at `/pricing`, choose Growth + Accommodation + Finance-AI, pay, be provisioned, land on dashboard. 583 tests still pass.

### Sprint 2 (Weeks 3–4) — "First paying client readiness"

**Theme:** Site redesign + brand voice + onboarding + cost monitoring. Easy/Advanced mode pattern for ONE module as proof-of-concept (not all 6 — scope risk).

| Order | Item | Rationale | Risk |
|---|---|---|---|
| 2.1 | Site redesign: `app/page.tsx`, `app/pricing/page.tsx`, `components/landing/*` | Public-facing, must look commercial-ready | Low tech risk, design iteration risk. |
| 2.2 | Migration `23_brand_voice.sql` (extend `client_profiles`) + `lib/brand/loader.ts` + `lib/brand/prompt-injector.ts` + tests | Enables cache savings on every AI call; onboarding needs it | Low. Extends existing table. |
| 2.3 | Modify `lib/agents/base-agent.ts` to accept optional `systemBlocks` + wire brand voice | All agents benefit immediately | Med. Must not break the 4 accommodation agents + 2 CRM agents. Pass-through design keeps backwards compat. |
| 2.4 | Migration `27_onboarding_progress.sql` + `lib/onboarding/day-sagas.ts` + provisioning step 10 + 3 N8N workflows | 3-day onboarding for new tenants | Med. Test mode toggle required for dev. |
| 2.5 | Onboarding wizard extension: brand voice capture in UI (4-field form in existing `/onboarding` route) | Captures brand at signup | Low. |
| 2.6 | `components/module-home/*` + one proof-of-concept: CRM Easy mode at `/dashboard/crm` with Advanced at `/dashboard/crm/advanced` | Validates pattern before replicating | Med. This is THE UX pattern — get it right. |
| 2.7 | Migration `29_daily_cost_rollup.sql` + `scripts/cron/nightly-cost-rollup.ts` + Vercel cron + `/admin/cost-monitoring` page | Chris needs visibility before first real client spends money | Low, non-blocking for launch. |
| 2.8 | Smoke test with first paying client sandbox | Validation | — |

**Exit criteria:** first paying client can sign up, onboard, see brand voice in their content, use CRM Easy mode, Chris sees their cost vs revenue.

### Sprint 3 (Weeks 5–6) — "Campaign Studio + remaining Easy modes"

**Theme:** Composite product features that justify the "AI-powered OS" positioning.

| Order | Item | Rationale |
|---|---|---|
| 3.1 | Migration `26_campaign_runs.sql` + `lib/campaigns/*` (planner, generator, scheduler, analytics) | Central composite feature |
| 3.2 | `/api/campaigns/*` routes |  |
| 3.3 | `app/(dashboard)/campaigns/page.tsx` + `/advanced` |  |
| 3.4 | Replicate ModuleHome pattern for Email, Accommodation, Restaurant, Content Studio, Campaigns (5 more modules) |  |
| 3.5 | Aggregate `/dashboard` home — meta-view of all module cards (the "overall Easy mode") |  |

### Sprint 4 (Weeks 7–8) — "Embedded finance + receipts"

**Theme:** The remaining commercial-launch differentiator — finance-in-verticals. Scope this last because it depends on everything else.

| Order | Item |
|---|---|
| 4.1 | Migration `24_finance_core.sql` + `lib/finance/knowledge/*` (SA VAT, SARS formats) + `lib/finance/ledger.ts` + tests |
| 4.2 | `lib/accommodation/finance/` adapter + subscriber on `emitBookingEvent` |
| 4.3 | `/api/finance/transactions`, `/api/finance/vat-register` |
| 4.4 | `app/(dashboard)/finance/page.tsx` (Easy) + `/advanced` |
| 4.5 | Migration `25_finance_receipts.sql` + new Telegram bot setup + `/api/webhooks/telegram-finance` + OCR via Claude Haiku 4.5 vision |
| 4.6 | `lib/restaurant/finance/` adapter (the restaurant module itself is pre-existing per `lib/restaurant/`; just add the finance wrapper) |

---

## Migration Strategy (existing tenants — do not break production)

The nightmare scenario: a migration runs against prod, `restaurant-sop-upgrade` branch merges to main, 583 tests passed in isolation but a live tenant hits an edge case we didn't anticipate. Here's the containment plan per area.

### Billing (composition tables)

**Existing tenants** have `organizations.plan_id` ∈ {core, growth, scale} and possibly `subscription_status='active'` with a PayFast token.

**Migration approach:**

```sql
-- After 22_billing_composition.sql creates subscription_composition:
INSERT INTO subscription_composition (organization_id, base_plan_id, active_addons, monthly_total_zar)
SELECT
  o.id,
  COALESCE(o.plan_id, 'core'),
  '{}'::text[],
  bp.price_zar
FROM organizations o
LEFT JOIN billing_plans bp ON bp.id = COALESCE(o.plan_id, 'core')
WHERE NOT EXISTS (SELECT 1 FROM subscription_composition sc WHERE sc.organization_id = o.id);
```

This backfills every existing tenant with `active_addons=[]` and the correct base plan. New signups use composition UI; existing tenants see "Add modules" in settings but have none currently. PayFast subscriptions untouched. **No billing change is applied automatically.**

### Pricing page replacement

Keep `app/pricing/page.tsx` behaviour semantically identical for the 3 existing tiers (core / growth / scale) with the same PayFast flow. Composition UI becomes the default but the 3 base plans are the first row; addons are a second section. Existing `/signup?tier=core` deep links must continue to work — add a router-level redirect that pre-fills the composition UI if tier query param present.

### Usage enforcement

New `guardUsage` only lands on top 5 routes in Sprint 1.6. It reads `billing_plans.limits` via existing RPC. Every existing tenant already has a valid `plan_id` and `billing_plans` has limits for all three plans. No risk.

**Watch for:** Tenants who have been hammering the legacy `client_usage_metrics` counter to the limit but whose `usage_events` shows zero (because the route wasn't wired). When we add guardUsage, they suddenly have fresh month-to-date = 0 and effectively get a quota refresh on migration day. This is fine (generous) but we should communicate it.

### Brand voice

`client_profiles` is extended additively. Existing rows have fields NULL / empty-array defaults. `brand.loader` returns `{ tone:'professional', brandDo:[], brandDont:[], ...defaults }` if nothing is set. Every existing agent call keeps working; it just doesn't get the cache benefit until brand voice is populated.

### Easy/Advanced mode

**Risk:** Existing users bookmark `/dashboard/crm`. We're making that Easy by default, so they may see a stripped-down page.

**Mitigation:** `user_profiles.ui_mode` defaults to `'advanced'` for existing users (set via backfill migration) and `'easy'` for new signups. Existing users never experience the change unless they opt in. The `ModeToggle` is available in the sidebar so discovery is easy.

### Onboarding

Runs only on new provisioning. Zero impact on existing tenants.

### Known risks — flagged explicitly

| Risk | Severity | Mitigation |
|---|---|---|
| PayFast item_code prefix dispatch: unknown prefix silently drops webhook | HIGH | Explicit catch-all: log `['PayFast] unhandled item_code prefix: X` and 202-ack so PayFast doesn't retry forever. |
| Prompt cache breakpoint in BaseAgent breaks existing agents | MED | Cache is additive: if systemBlocks not passed, behaviour is identical to today. Keep scalar `system` path. |
| Composition migration trigger not updating `monthly_total_zar` when addons added via API | MED | App-level recompute in `lib/billing/composition.ts::addAddon()`. Add `CHECK` constraint `monthly_total_zar >= 0`. Schedule a nightly reconcile script that recomputes from truth. |
| `client_usage_metrics` ↔ `usage_events` dual-state drift | MED | Sprint 1 audit: find every read/write of `client_usage_metrics`, either migrate to `usage_events` or delete the write. Probable dead code in `handlePaymentComplete`'s `reset usage metrics` block — those counters aren't month-boundaried anyway. |
| Existing 6 agents break when BaseAgent signature changes | MED | Make `systemBlocks` param optional; existing config's scalar `systemPrompt` stays. Only new consumers use blocks. Tests cover both paths. |
| Brand voice loader fires DB query per agent call → adds latency | LOW | In-memory LRU cache keyed on `orgId` with 60s TTL in `lib/brand/loader.ts`. Brand voice edits invalidate cache via in-process event. At 1 Vercel function instance per region, 60s cache is fine. |
| N8N workflows referencing non-existent tables on day-1 email send | MED | Onboarding step 10 seeds default templates. N8N workflows import templates by name, not ID. Template seed is idempotent. |
| Restaurant module finance work (Sprint 4.6) blocked by non-existent `restaurant_orders` | HIGH if restaurant orders aren't built | `lib/restaurant` has `api-helpers`, `constants`, `payfast`, `telegram` — but "orders" may not exist. Audit in Sprint 3 before committing Sprint 4.6. If not built, move to v3.1. |
| Vercel cron hobby-tier limit (2 crons) already used | LOW | Audit `vercel.json` before 2.7. If no room, move cost-rollup to N8N. |

---

## Sources

Grounded in the following code read during this research:

- `C:\Dev\draggonnb-platform\CLAUDE.md` — platform overview
- `C:\Dev\draggonnb-platform\.planning\PROJECT.md` — module inventory + scale
- `C:\Dev\draggonnb-platform\lib\payments\payfast.ts` — PRICING_TIERS constant (legacy)
- `C:\Dev\draggonnb-platform\lib\tier\feature-gate.ts` — hierarchy + legacy checkUsage
- `C:\Dev\draggonnb-platform\lib\auth\get-user-org.ts` — central auth
- `C:\Dev\draggonnb-platform\lib\supabase\middleware.ts` — subdomain resolution + module gating
- `C:\Dev\draggonnb-platform\lib\agents\base-agent.ts` — Anthropic + session storage
- `C:\Dev\draggonnb-platform\lib\agents\CLAUDE.md` — agent build spec
- `C:\Dev\draggonnb-platform\lib\provisioning\CLAUDE.md` — saga pattern
- `C:\Dev\draggonnb-platform\app\api\CLAUDE.md` — API conventions
- `C:\Dev\draggonnb-platform\lib\accommodation\events\dispatcher.ts` — emitBookingEvent pattern
- `C:\Dev\draggonnb-platform\lib\content-studio\prompt-builder.ts` — existing prompt pattern
- `C:\Dev\draggonnb-platform\lib\billing\{plans,subscriptions,types}.ts` — existing billing
- `C:\Dev\draggonnb-platform\lib\usage\meter.ts` — existing usage metering
- `C:\Dev\draggonnb-platform\lib\autopilot\client-profile.ts` — brand voice home
- `C:\Dev\draggonnb-platform\supabase\migrations\10_shared_db_foundation.sql` — module_registry, tenant_modules
- `C:\Dev\draggonnb-platform\supabase\migrations\11_billing_plans.sql` — billing_plans catalog
- `C:\Dev\draggonnb-platform\supabase\migrations\12_usage_metering.sql` — usage_events + RPCs
- `C:\Dev\draggonnb-platform\supabase\migrations\13_credit_packs.sql` — credit_pack_catalog
- `C:\Dev\draggonnb-platform\supabase\migrations\05_leads_and_agents.sql` — agent_sessions schema
- `C:\Dev\draggonnb-platform\app\pricing\page.tsx` — current pricing UI

External references (confidence MEDIUM — typical patterns, not verified against current Anthropic docs in this session):

- Anthropic prompt caching — `cache_control: { type: 'ephemeral' }`, 5min TTL, cached tokens at 10% rate. This is a documented SDK feature as of the Sonnet 4/Haiku 4.5 era; verify exact rate & cache TTL against current docs before committing Sprint 2.3.
- PayFast subscription amendment — "cancel-and-recreate" is the proven path in this codebase (`cancelPayFastSubscription` already exists). PayFast v1 API supports `/subscriptions/{token}/adhoc` for top-up charges; confirm at implementation time.
- SA VAT rate 15% standard — stable since 2018. Tourism levy 1% on accommodation. Verify current rate via SARS/NDT docs at implementation time (no known changes 2026).

---

*Architecture research for: DraggonnB OS v3.0 Commercial Launch — integration architecture*
*Researched: 2026-04-24*
