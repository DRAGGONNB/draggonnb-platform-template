# Pitfalls Research — DraggonnB OS v3.0 Commercial Launch

**Domain:** Brownfield commercial pivot of a live multi-tenant B2B SaaS (SA SME market)
**Researched:** 2026-04-24
**Confidence:** HIGH (pricing/PayFast/Anthropic/POPI/SARS facts verified against official sources); MEDIUM on brand-voice cache behavior (relies on documented Anthropic workspace-isolation change)

**Severity legend (cost if it happens):**
- **CATASTROPHIC** — kills the business (bankruptcy, legal action, >50% churn, PR disaster)
- **HIGH** — loses a paying client, multi-day outage, multi-R10k remediation
- **MEDIUM** — hours-to-days of rework, customer complaint, support escalation
- **LOW** — annoyance, minor rework, caught in next sprint

**Context assumption:** 8 existing orgs (mostly test/seed, some early real), 583 tests green, tsc clean, 21 env vars already, first paying client target ~2 weeks, founder is sole builder, no QA team.

---

## Critical Pitfalls — Must prevent before v3.0 ships

### Pitfall 1: PRICING_TIERS mutation breaks existing billing mid-flight

**Severity:** CATASTROPHIC

**What goes wrong:**
`PRICING_TIERS` in `lib/payments/payfast.ts` is used at three different moments: (1) at checkout to build the PayFast subscription form (`createPayFastSubscription`), (2) at ITN webhook time to validate amount (`validatePaymentAmount`), (3) at runtime to read `limits` for gating. If you change `price` or `limits` in a deploy while PayFast is mid-way through an ITN retry for a subscription signed up under the old price, the webhook rejects the payment ("amount mismatch"), PayFast retries, eventually cancels the subscription, and the org silently downgrades to unpaid. No one notices until the customer emails.

**Why it happens:**
- Pricing is inlined as a const, not a versioned row in the DB
- No "billing snapshot" is captured on the org at subscription time
- ITN handler compares received amount to *current* `PRICING_TIERS[tier].price`, not the price that was active when the org subscribed

**How to avoid:**
1. Add `organizations.billing_plan_snapshot JSONB` column migrated before any pricing change (captures tier name, price, limits, effective_at at subscribe time)
2. ITN handler validates `received_amount` against `org.billing_plan_snapshot.price`, not `PRICING_TIERS[tier].price`
3. Rename `PRICING_TIERS` → `PRICING_TIERS_V3` and keep `PRICING_TIERS_V2` (current) until all 8 existing orgs are either migrated (via PayFast subscription "edit amount") or confirmed to be test-only
4. Add a `pricing_changelog` table with effective_at; never delete historical rows
5. Write a migration script that audits all existing `organizations` rows and classifies them: test / dormant / paying. Only paying orgs need PayFast-side update

**Warning signs (detect early):**
- ITN webhook logs showing `payment_status=COMPLETE` but org state not advancing
- `validatePaymentAmount` returning false for known-good customers
- PayFast dashboard showing subscription in "paused" or "cancelled" state for an active-in-DB org
- Spike in `/api/webhooks/payfast` 400 responses

**Phase to address:**
Sprint 1, Phase 01 (Pricing Migration Foundation) — must ship the snapshot column and dual-table rename BEFORE the UI pricing page changes. Not optional.

**Recovery if it happens:**
- MEDIUM cost if caught within 24h (PayFast retries ITN for ~3 days — can be re-processed manually)
- HIGH cost if caught after PayFast auto-cancels (customer has to re-subscribe, payment details re-entered)

---

### Pitfall 2: PayFast subscription state desync — we update price, PayFast keeps charging old

**Severity:** HIGH

**What goes wrong:**
Changing `PRICING_TIERS[tier].price` in the codebase does NOT update the subscription amount at PayFast. PayFast stores the `recurring_amount` on their side, per subscription token, set at the moment `createPayFastSubscription` was called. If you raise prices, PayFast keeps debiting the old amount forever. If you lower prices, customers keep paying the old (higher) amount and complain. The *only* way to update is via PayFast's subscriptions update API or their dashboard (manually, per subscription).

**Why it happens:**
- Assumption that PayFast "looks up" our price on each charge — it doesn't; it uses the amount set at form submission
- No code path currently exists to call PayFast's "update subscription" endpoint
- PayFast's developer docs describe update/pause/cancel endpoints but we've never used them

**How to avoid:**
1. Build `lib/payments/payfast-subscription-api.ts` with `updateSubscriptionAmount(pf_token, new_amount)` using PayFast's subscription API (merchant-authenticated)
2. Store `pf_token` (returned by PayFast on first successful payment) on `organizations.payfast_subscription_token`
3. On any pricing change, require a manual operator flow: "These 3 orgs are on the old price. Push update to PayFast? [confirm]"
4. Never assume a deploy synchronizes prices — always an explicit operator action
5. Email customers 30 days before any price change (SA consumer protection best practice)

**Warning signs:**
- `org.billing_plan_snapshot.price` differs from `pf_subscription.recurring_amount` at PayFast
- Customer emails saying "I was charged wrong amount"
- Reconciliation job (cron) detects mismatch between DB expected amount and PayFast's reported amount

**Phase to address:**
Sprint 1, Phase 01 (Pricing Migration Foundation) alongside Pitfall 1. Build the API wrapper even if first use is manual.

**Recovery cost:** MEDIUM — credit/refund via PayFast is mechanical but annoying and damages trust.

---

### Pitfall 3: Anthropic cost runaway on a single abusive tenant

**Severity:** CATASTROPHIC

**What goes wrong:**
A client on Core (R1,500/mo) figures out Campaign Studio can generate long posts and loops "regenerate" a hundred times. Or a bug in autopilot retries on 500s. Or a malicious actor compromises a Core account. Claude bill hits R3,000 in a day. Subscription revenue R1,500/mo. You lose money on every call, no circuit breaker exists, AWS-style bill shock follows. With 25 clients this can be a five-figure-ZAR monthly surprise.

**Why it happens:**
- No per-tenant hard ceiling on Anthropic spend
- No circuit breaker on consecutive identical requests
- Hard usage caps (posts/generations per month) measured in *count*, not in *Anthropic tokens or cost*
- A "200 generations" cap at Growth can mean 200 × 30k-token generations = 6M tokens = real money

**How to avoid:**
1. Track `anthropic_tokens_used` and `anthropic_cost_zar` per org per month in a `ai_usage_ledger` table (write after every BaseAgent call, including on errors/retries)
2. Per-tier hard ceiling in ZAR: Core=R150/mo, Growth=R400/mo, Scale=R1,500/mo Anthropic spend budget. Ceiling is checked BEFORE the Anthropic call, not after.
3. Enforce Haiku 4.5 as default (`$1/$5 per 1M tokens`) — never let agents default to Sonnet without an explicit flag
4. Prompt caching MUST hit: system prompts for brand voice and module context need to be ≥4,096 tokens to qualify for Haiku 4.5 caching (verified 2026-04 Anthropic docs — Haiku 4.5 cache minimum is 4,096 tokens, unlike Sonnet/Opus at 1,024)
5. Rate limit: max 10 Anthropic calls per org per minute across all agents (circuit breaker via Redis or DB row)
6. Cost alerts at 50% / 75% / 90% of tier ceiling — email both operator and client
7. Auto-pause agents (not entire module) when 100% ceiling hit; client sees banner + upgrade CTA

**Warning signs:**
- Anthropic dashboard spend climbing disproportionately to new signups
- Single org's `anthropic_cost_zar` > 20% of their MRR in a single week
- `cache_read_tokens / total_input_tokens` ratio < 50% (caching not working)
- Same agent session making >20 calls in <5 minutes

**Phase to address:**
Sprint 1, Phase 02 (Unit Economics Guards) — ships WITH or BEFORE any AI UX changes. No new AI surface area until this lands.

**Recovery cost:** CATASTROPHIC if multi-tenant; HIGH if single tenant caught at <R5k spend.

---

### Pitfall 4: Brand voice prompt-cache key collision → tenant A sees tenant B's voice

**Severity:** CATASTROPHIC (POPI + reputational)

**What goes wrong:**
If brand voice is stored in a system prompt and cached, and the cache key is not tenant-scoped, Anthropic's prompt cache can return a response influenced by or attributed to another tenant's context. Anthropic isolates caches at *organization level* (your Anthropic org, which is the single DraggonnB account holding all tenants) by default — meaning cross-tenant cache hits ARE possible within your single Anthropic org. Starting 2026-02-05, Anthropic moved to *workspace-level* isolation, which helps only if you create one Anthropic workspace per tenant (which you don't and shouldn't).

**Why it happens:**
- Naive implementation: `system = "You are brand voice for: ..." + voiceDoc` with no cache-control or tenant-scoping
- Assumption that "Anthropic handles isolation" — they isolate between *workspaces*, not between your tenants within one workspace
- Brand voice docs that include client trade secrets, customer data, or founder personal details end up in cached prefix

**How to avoid:**
1. Include `organization_id` as a distinct message block at the start of system prompt (forces cache miss between tenants even if voice content is similar)
2. Never include PII in brand voice content sent to Anthropic — scrub names, emails, phone numbers before storing in `brand_voice_prompt`
3. Add a "cache tag" header or metadata field containing `org_id` to every Anthropic call, so if Anthropic ever exposes cache telemetry you can audit
4. Use `cache_control: { type: "ephemeral" }` with a tenant-specific hash at the start of the cached block — makes cache key tenant-unique
5. Test: provision two orgs with DIFFERENT voices, generate identical prompts, verify outputs differ (golden test in CI)
6. Review `brand_voice_prompt` length: must be ≥4,096 tokens to hit Haiku 4.5 cache, but also must not bloat to 30k+ tokens or cost per call explodes

**Warning signs:**
- Generated content mentions another tenant's brand name, product, or tone
- Support ticket: "This doesn't sound like us at all"
- Two tenants with similar industries producing suspiciously similar outputs
- Cache hit rate > 95% across tenants (should be per-tenant high, cross-tenant should be 0)

**Phase to address:**
Sprint 2, Phase 03 (Brand Voice Foundation) — cannot ship brand voice without the tenant-scoped cache-key pattern verified by integration test.

**Recovery cost:** CATASTROPHIC — POPI breach notification required, trust permanently damaged.

---

### Pitfall 5: Usage-cap counter race condition (concurrent requests exceed cap)

**Severity:** HIGH

**What goes wrong:**
Client is at 29/30 social posts. Scheduler fires two concurrent posts at 09:00 sharp. Both read "current=29, limit=30", both pass the check, both increment to 30. Now they posted 31 posts on a Core plan. This also applies to `ai_generations`, `agent_invocations`, and `email_sends`.

**Why it happens:**
- Read-then-write pattern without atomic increment
- Node.js concurrency + multiple Vercel lambda instances
- `await supabase.from('usage').select().then(check).then(update)` is not atomic

**How to avoid:**
1. Use Postgres atomic increment with RETURNING and a CHECK constraint: `UPDATE usage SET count = count + 1 WHERE org_id = $1 AND month = $2 AND count < $3 RETURNING count`. If no row returned, cap was hit. Never read-then-write.
2. Or use Postgres advisory lock scoped to (org_id, resource, month)
3. Write unit test with 50 concurrent requests hitting the cap boundary; expect exactly `limit` successes, rest fail
4. Idempotency key on the incrementing endpoint so retries don't double-count

**Warning signs:**
- `usage_ledger.count > tier.limit` for any row (invariant violation — add alert)
- Customer reports "you said I had 1 left but it let me post 3"
- Load-test in staging shows 101/100 under concurrency

**Phase to address:**
Sprint 2, Phase 04 (Usage Caps Enforcement) — must include atomic-increment primitive as first commit, before wiring to any module.

**Recovery cost:** MEDIUM if caught early (retroactive correction); HIGH if customer uses the over-limit use as evidence of "the caps are fake" (trust damage).

---

### Pitfall 6: Finance module tax-calc error causes client's SARS audit

**Severity:** CATASTROPHIC (existential — we become "that platform that got me audited")

**What goes wrong:**
Vertical finance module auto-generates VAT figures. A rounding error, or misapplied zero-rating, or a missed VAT rate change, produces returns that don't tie to invoices. Client submits to SARS, gets audit, traces it to DraggonnB output. Reputation in SA SME market is destroyed. Chain-reaction churn among all tourism clients.

**Why it happens:**
- Common misconception: "accommodation for foreign tourists is zero-rated" — FALSE. Accommodation *consumed in SA* is standard-rated regardless of guest residency (Section 11(2)(l) VAT Act). Only certain agent/commission arrangements zero-rate. (Verified against SARS VAT 411 and IPTGSA.)
- VAT rate history: 15% from 1 April 2018, stayed at 15% in 2025 (proposed 15.5%/16% was withdrawn). Any hard-coded rate is a time bomb.
- Tourism VAT has special rules around package tours, commission-vs-principal, agent arrangements
- Rounding: cent-level discrepancies across hundreds of line items become rands
- No professional tax review of generated outputs

**How to avoid:**
1. **Do not ship auto-filed returns.** Generate *drafts* with prominent disclaimers: "Review with your accountant before submitting to SARS"
2. VAT rate stored in `tax_rates` table with `effective_from`/`effective_to` dates; never hard-coded
3. VAT calculation is line-item level in cents (integer), not R-level (float); sum at invoice level; never round per-line and then sum
4. Do NOT auto-apply "zero-rated tourism" logic. Default accommodation to 15% standard rate. Require explicit flag + stored evidence (e.g., passport copy + confirmation guest was not in SA when services arranged) for any zero-rating, per SARS agent-principal rules
5. Every finance output includes an audit trail: input → transformation → output, stored in `finance_audit_log`
6. Get one SA accountant to review the first 3 clients' month-1 outputs before claiming "SARS-ready"
7. Owner-payout calculations: publish formula to client BEFORE first payout; require their sign-off on formula; store signed-off version per payout

**Warning signs:**
- VAT totals don't reconcile to line items (even by 1 cent — means rounding bug)
- Tax rate mismatch with SARS published rates
- Customer accountant emails saying "these numbers are wrong"
- `finance_audit_log` entries without corresponding source documents

**Phase to address:**
Sprint 4+ (Embedded Finance) — this is the most dangerous module in v3.0. Must ship with accountant review gate, feature-flagged on per-tenant basis, *never* marketed as "SARS-ready" in month 1.

**Recovery cost:** CATASTROPHIC — one audit-trace-to-DraggonnB story ends the SA SME funnel.

---

### Pitfall 7: Easy/Advanced view desync — edit in one, stale in other

**Severity:** HIGH

**What goes wrong:**
User edits a setting in Easy view ("Turn on AI assistant"), switches to Advanced view, the full form shows the old value, user clicks Save, change reverts. Or: user edits a field in Advanced that doesn't exist in Easy, Easy shows a summary that's now wrong. Two views of the same data need *one source of truth*, not two.

**Why it happens:**
- Easy view implemented as a simplified duplicate component with its own state
- Form values fetched independently in each view
- Caching (React Query, SWR) with different cache keys per view
- Optimistic updates that only update local component state

**How to avoid:**
1. One server-side source of truth per entity; both views are *different renderings* of the same data
2. React Query / SWR: use the SAME cache key for both views; on mutation, invalidate that one key
3. Easy view shows *summary* from the full object; never a separate "easy-object" in the DB
4. Persist draft state (`entity_drafts` table keyed by user+entity) so switching views doesn't lose unsaved edits
5. Integration test: edit in Easy → switch to Advanced → assert field reflects the edit (and vice versa)
6. Telemetry: log `view_switch_during_edit` events and watch for save-then-revert patterns

**Warning signs:**
- Customer support ticket: "I saved it but it went back"
- Telemetry: user toggles Easy/Advanced mid-edit and then saves — check if stored value matches last-input value
- Mutations to same entity from two components within 5 seconds of each other

**Phase to address:**
Sprint 2, Phase 05 (Easy/Advanced Shell) — ship the view-toggling primitive with an invariant test suite before any module adopts it.

**Recovery cost:** MEDIUM — typically a single-user bug report; fix is tractable; but erodes trust.

---

### Pitfall 8: Campaign Studio posts to wrong account or wrong channel

**Severity:** HIGH (brand-damaging, potentially legal)

**What goes wrong:**
Client has 3 social accounts: restaurant, owner's personal Facebook, a dormant test account. Campaign posts "Sunday brunch 50% off" to the owner's personal wall instead of the restaurant page. Or a festive campaign runs the day a national tragedy is declared and posts anyway. Or a Facebook token expired silently 3 days ago and all "sent" posts are queued in limbo.

**Why it happens:**
- `social_accounts.id` selection in UI is by index or name, not stably by ID
- No explicit "this post will be posted to: [account name + avatar]" confirmation step
- No token-expiry monitoring job
- No "pause all publishing" kill-switch for external events
- AI-generated content shipped without brand-appropriateness check

**How to avoid:**
1. Publishing confirmation shows channel icon + account name + preview in final step; requires explicit click (not form submit)
2. `social_account_tokens.expires_at` with a daily cron that refreshes or alerts 7 days before expiry
3. Per-tenant "publishing kill switch" (single DB flag) — operator-level override for external events
4. Post-publish verification: after posting, fetch the post URL from the platform API and store; if fetch fails, mark as `publish_suspect` not `published`
5. AI content passes a "brand safety" check (cheap Haiku call: "Does this content mention grief/tragedy/controversy? Y/N") before auto-publishing; HUMAN review on Y
6. Never default to "auto-publish" for first 30 days of a tenant's use — default to "draft, notify, then human clicks publish"

**Warning signs:**
- Post with `status=published` but platform-API fetch returns 404
- Token expiry alerts ignored for >3 days
- Campaign with 100 scheduled posts and 0 actually delivered
- Spam-detection flag from Facebook/LinkedIn

**Phase to address:**
Sprint 3 (Campaign Studio) — confirmation UI + token monitor + kill switch are table stakes, not nice-to-have.

**Recovery cost:** HIGH — public-facing mistakes are screenshot-worthy; clients churn fast when brand image is at stake.

---

### Pitfall 9: Hard cap triggered at worst-possible moment (no grace, no path forward)

**Severity:** HIGH

**What goes wrong:**
Client on Core has scheduled 30 posts for the month — their big Sunday brunch campaign. At 22:47 on Saturday, they try to add a 31st for Sunday's lunch service. Hard cap blocks it. Error message: "Upgrade to Growth." No operator on duty Saturday night. Campaign flops. Client churns on Monday.

**Why it happens:**
- Cap is a binary block with no grace
- No self-service upgrade flow
- No "overage" / pay-per-extra option
- Error copy is transactional, not empathetic
- No nearing-cap notification sent earlier in the month

**How to avoid:**
1. Soft warnings at 50% / 75% / 90% of cap (email + in-app)
2. At 100%: offer *three* options inline, not just "upgrade":
   - Upgrade tier (self-service via PayFast subscription-update API)
   - Pay-per-overage (pre-priced, pre-consented on signup ToS, e.g. R50 per extra post)
   - Wait until month reset (show exact reset timestamp in their timezone)
3. Grace buffer: allow 10% overage silently in month 1 of a tenant's life (new user forgiveness), surcharge in month 2+
4. Monthly reset uses org's timezone (`organizations.timezone`), default Africa/Johannesburg
5. "Before your last 3 posts" warning — make the cap approach feel intentional, not ambushing

**Warning signs:**
- Monthly cap-hit events clustered at end of billing cycle (users surprised)
- Churn correlates with cap-hit in the previous 7 days
- Support tickets with "I can't post" in subject
- Zero self-service tier upgrades (they bail instead of upgrading)

**Phase to address:**
Sprint 2, Phase 04 (Usage Caps) — UX of the cap is the feature; ship the block and the upgrade paths together.

**Recovery cost:** HIGH — a cap-triggered churn is preventable revenue loss.

---

### Pitfall 10: Provisioning saga fails at step 5-9, client sees "setting up..." forever

**Severity:** HIGH

**What goes wrong:**
The 9-step provisioning saga succeeds through step 4 (seed-data), then step 5 (n8n-webhooks) fails because n8n is down, or step 6 (deploy-automations) fails because a template has a syntax error. Org row exists, admin account exists, but modules aren't activated. Client gets a welcome email, logs in, sees an empty dashboard or an error state. "3-day onboarding promise" is already broken at minute 1.

**Why it happens:**
- Saga compensations exist but rollback cascades via `DELETE FROM organizations` — destroys the org entirely on step 5 failure, making step 1-4 work wasted
- No "resume from step N" mechanism
- No operator alert when a step fails
- N8N and Resend dependencies are single points of failure in the saga

**How to avoid:**
1. Saga state persisted to `provisioning_jobs` table with per-step status (pending/running/success/failed/skipped)
2. On failure: saga pauses (not rollback-cascade); operator receives Telegram alert with job ID + failing step + error
3. Client sees "Finalizing your workspace — we'll email when ready" (not "error"), and a real human-or-bot response within 1 hour
4. Steps 5-9 (integrations) are IDEMPOTENT and RETRYABLE — rerunning step 5 doesn't create duplicate N8N workflows
5. Make step 5-9 optional at provision time (defer): org is USABLE after steps 1-4 even if 5-9 are queued
6. Health check endpoint per dependency (N8N, Resend, PayFast) runs before starting a provisioning job; if any red, queue the job instead of running
7. "3-day onboarding" clock starts from *successful saga completion*, not from payment; communicate this honestly

**Warning signs:**
- `provisioning_jobs.status = 'failed'` count > 0 in last 24h
- New org created but `tenant_modules` row count = 0 after 10 min
- Welcome email sent but onboarding sequence never triggers
- N8N webhook registrations failing silently in logs

**Phase to address:**
Sprint 1, Phase 01 (Pricing Migration Foundation) or Sprint 2 (Onboarding Promise) — depending on sequencing. Saga state machine + operator alerts are non-negotiable before promising "3 days."

**Recovery cost:** HIGH — first-paying-client failure is 10x worse than client-50 failure.

---

### Pitfall 11: Environment variable sprawl + misconfiguration in production

**Severity:** HIGH

**What goes wrong:**
Already at 21 env vars. v3.0 adds more (Anthropic budget ceilings, PayFast subscription API key, feature flags for Campaign Studio, tax rate provider config, Vertical finance toggles). One gets misconfigured in Vercel prod (e.g., `PAYFAST_MODE=sandbox` in prod), goes unnoticed, real customer payments go to sandbox, money "lost."

**Why it happens:**
- Vercel env-var UI doesn't diff across envs easily
- No runtime assertion that required-in-prod vars are set and sensible
- `PAYFAST_MODE` default is 'sandbox' (see `getPayFastConfig` line 222) — a missing env var silently falls through to sandbox in production

**How to avoid:**
1. Startup assertion: on every lambda cold start, validate env vars against a `env-schema.ts` (Zod); if fail, throw and log alert — don't silently default
2. Specifically assert `PAYFAST_MODE === 'production'` when `VERCEL_ENV === 'production'`; crash if mismatch
3. Health endpoint `/api/ops/env-health` returns env-configuration hash (not values); compare across deploys to detect drift
4. Add `ENV_SCHEMA_VERSION` that CI checks against — if schema changes but Vercel vars don't, deploy fails
5. Namespacing: `DRAGGONNB_PUBLIC_*` for client-side, `DRAGGONNB_BILLING_*` for payments, `DRAGGONNB_AI_*` for Anthropic; reduces "which one does what" cognitive load

**Warning signs:**
- `PAYFAST_MODE != 'production'` in production logs
- Anthropic API key rotated but old value still in use (= some var not updated everywhere)
- Env vars in Vercel prod differ from those in `.env.example`
- Customer complaint: payment went through but subscription didn't activate

**Phase to address:**
Sprint 1, Phase 01 — env-schema assertions are a 1-hour task and prevent catastrophic misconfig. Not optional.

**Recovery cost:** MEDIUM to HIGH — depends on how long before caught.

---

### Pitfall 12: Database migration breaks RLS or existing-data invariants mid-deploy

**Severity:** HIGH

**What goes wrong:**
Migration 15 adds `organizations.billing_plan_snapshot`. Migration 16 adds NOT NULL constraint on same column. During the ~90 seconds between migrations applying and the new app version deploying, existing API calls attempt to insert orgs without the snapshot → constraint violation → 500 errors for all org creations. Or: a new RLS policy is added that references a column that doesn't exist yet → `get_user_org_id()` starts failing → ALL queries for ALL tenants break simultaneously.

**Why it happens:**
- Vercel/Supabase deploy ordering isn't atomic
- Migrations run before code deploys (or vice-versa, depending on setup)
- NOT NULL constraints added before backfill
- `FORCE ROW LEVEL SECURITY` enabled on a table before policies are fully deployed

**How to avoid:**
1. Multi-step migrations: (1) add column NULLABLE, (2) deploy code that writes it, (3) backfill script, (4) add NOT NULL in a later migration
2. Never combine "add column" + "add constraint" in one migration
3. RLS policy changes: deploy policy first with permissive fallback, then tighten after confirming traffic works
4. Test migrations against a clone of prod DB before applying (Supabase has branching — use it)
5. Migration runbook PER migration: "what must be true before? after? rollback?"
6. Migration freeze during business-critical windows (e.g., 15-20 of month when SA payrolls hit)

**Warning signs:**
- 500 rate spike coinciding with deploy
- `pg_stat_activity` shows blocked queries on a newly-altered table
- `relation does not exist` or `column does not exist` in logs
- RLS violation errors for queries that previously worked

**Phase to address:**
Sprint 1 and every subsequent sprint — migration discipline is a *process* pitfall, not a feature pitfall. Add to CLAUDE.md as a mandatory checklist.

**Recovery cost:** HIGH — can require DB-level rollback, which is risky with RLS.

---

### Pitfall 13: SEO regression on the marketing redesign

**Severity:** MEDIUM to HIGH

**What goes wrong:**
Marketing site redesign renames/moves URLs. Google-indexed `/pricing` now lives at `/plans`. No redirects. SA organic traffic (already small — DraggonnB is new) craters. Crawl errors spike. 3 months to recover.

**Why it happens:**
- URL structure decisions made without consulting analytics / Search Console
- Redirects treated as afterthought
- H1/meta-description changes break keyword rankings for competitor-comparison queries
- Page speed degrades (SA connections slower than global avg; Lighthouse on fast US test rig says "green" but real SA users suffer)

**How to avoid:**
1. Before redesign: export Google Search Console top 50 URLs by impression + clicks
2. Every renamed URL gets a 301 in `next.config.js` redirects array
3. Keep H1 keyword variants for ranking pages (even if visual design de-emphasizes H1)
4. Test with `npx lighthouse --throttling.cpuSlowdownMultiplier=4` to simulate SA connection
5. Core Web Vitals budget: LCP <2.5s on 3G simulation; fail deploy if over
6. Run sitemap through Screaming Frog (or similar) after deploy; compare to pre-deploy snapshot — every URL must be in one of: {same, 301'd, deliberately removed}

**Warning signs:**
- Search Console crawl errors spike within 48h of deploy
- Organic traffic drops >20% week-over-week
- Specific tracked keywords fall >5 positions
- `web.dev/measure` LCP > 3s on mobile

**Phase to address:**
Sprint 5+ (Site Redesign) — redirects + CWV budget are blockers on merge.

**Recovery cost:** MEDIUM in early-stage (little to lose); HIGH later when SEO matters more.

---

### Pitfall 14: Resend deliverability to SA ISPs degrades the onboarding sequence

**Severity:** MEDIUM to HIGH

**What goes wrong:**
Welcome email, day-1 email, day-2 email, day-3 email get sent. But they land in spam at Telkom, MWEB, Afrihost, or vodacom.co.za. Client never sees "your workspace is ready." Onboarding-sequence success rate looks green in Resend dashboard ("sent"), but open rate is 3%.

**Why it happens:**
- SPF/DKIM/DMARC not configured on `draggonnb.online` sender domain
- Sending domain reputation is new (warm-up not done)
- Email content triggers filters (too many links, spammy words, long subject lines)
- No bounce/complaint handling
- Onboarding emails sent from the same subdomain as transactional (cross-contamination of reputation)

**How to avoid:**
1. Verify SPF/DKIM/DMARC on `info@draggonnb.online` (already in use per recent commit 45a95bed) — test with `https://www.mail-tester.com/` pre-launch
2. Warm-up the sending domain BEFORE mass onboarding: manual sends daily for 2 weeks, ramping up
3. Monitor Resend webhook events: `bounced`, `complained`, `opened` — store per-recipient in `email_events` table
4. Separate subdomains: `hello@draggonnb.online` for onboarding/marketing, `noreply@` for transactional, `info@` for operations
5. Test the full onboarding email sequence against Gmail + Yahoo + a SA ISP inbox (MWEB is strict); track inbox-vs-spam placement
6. Plain-text alternative for every HTML email (spam filters hate HTML-only)
7. Unsubscribe link in every non-transactional email (POPI requirement also)

**Warning signs:**
- Open rate <15% on welcome email (vs. industry ~50%)
- Resend dashboard shows >2% bounce rate or >0.1% complaint rate
- Gmail postmaster tools shows domain in "high spam complaint" bucket
- Support ticket: "I never got the email"

**Phase to address:**
Sprint 2 (Onboarding Promise) — deliverability check is a blocker for the 3-day claim.

**Recovery cost:** MEDIUM — domain reputation repair takes weeks.

---

### Pitfall 15: Feature-gate misconfiguration — new modules accessible to unpaid clients

**Severity:** HIGH (revenue leak + confusion)

**What goes wrong:**
Campaign Studio ships. It's marketed as a Growth+ feature. But a bug in `tenant_modules.config` check means it's visible to Core clients too. They use it heavily. When they upgrade requests are made, they're annoyed: "but we already have it." OR: Core clients consume Anthropic tokens they didn't pay for.

**Why it happens:**
- Feature gating done at route level but not at API level (or vice versa)
- Middleware injects `x-tenant-modules` header but downstream code trusts the header without re-verifying
- New modules added to UI (visible) before `module_registry` + `tenant_modules` seeded correctly
- `TIER_MAP` / legacy-tier-name confusion (see `payfast.ts` line 88-96 — `starter` vs `core` dual-naming risks missed checks)

**How to avoid:**
1. Feature gate check in THREE places: middleware (route access), API route (action access), DB RLS (data access) — defense in depth
2. Integration test per new feature: provision a Core org, attempt to access the feature, assert 403
3. `module_registry` seed is part of the deploy — every new module adds a row with `minimum_tier`
4. Canonical tier names only in new code; `TIER_MAP` only for reading legacy data. New `PRICING_TIERS_V3` drops legacy keys.
5. Cron audit: daily job that logs any tenant using a module their tier doesn't include (catches misconfigurations within 24h)

**Warning signs:**
- Core tenant showing up in Growth-only feature usage logs
- `tenant_modules` row for a module the tenant's tier doesn't entitle
- Spike in Growth-only API route calls from Core tenants

**Phase to address:**
Sprint 2+ (every phase adding a module) — the audit cron goes in Sprint 1 as infrastructure.

**Recovery cost:** MEDIUM — refund exposure + client confusion.

---

## Moderate Pitfalls

### Pitfall 16: Prompt caching not hitting (Haiku 4.5 requires 4,096-token minimum)

**Severity:** MEDIUM (silent 10x cost increase)

**What goes wrong:**
Brand voice + system prompt totals 3,500 tokens. Below Haiku 4.5's 4,096-token minimum for cache eligibility. Every call is a full input charge; no cache-read discount. What you budgeted as R0.10/call is R1.00/call. Monthly Anthropic bill 10x over plan.

**How to avoid:**
1. Enforce system prompt ≥4,096 tokens when brand voice is in play (pad with stable module context if needed — don't bloat with tenant-specific noise)
2. Instrument `cache_read_input_tokens` and `cache_creation_input_tokens` from Anthropic API response; alert if cache hit rate <60% per tenant per day
3. Unit test: Claude call with brand voice enabled → response includes `cache_read_input_tokens > 0`
4. Use `cache_control: {type: "ephemeral"}` for the system prompt block; remember 5-min TTL (or pay 2x for 1-hour)

**Phase to address:** Sprint 2, Phase 03 (Brand Voice Foundation)

---

### Pitfall 17: Receipt OCR costs scale faster than revenue

**Severity:** MEDIUM (but trends toward HIGH at scale)

**What goes wrong:**
Vertical finance module accepts receipt uploads. Client uploads 500 receipts/month × 25 clients. OCR (whether Anthropic vision, Google Document AI, or AWS Textract) costs scale linearly. Gross margin on Growth tier erodes from ~70% to ~40%.

**How to avoid:**
1. Track OCR spend separately from Anthropic spend
2. Per-tier cap on OCR operations (Core: 100 receipts/mo, Growth: 500, Scale: unlimited with fair-use)
3. Batch OCR (cheaper than per-receipt) if volume permits
4. Cache OCR results by image hash — re-uploads don't re-process
5. Downsample images before OCR (cheaper, still accurate for receipts)

**Phase to address:** Sprint 4+ (Embedded Finance)

---

### Pitfall 18: Telegram bot flood (malicious or buggy)

**Severity:** MEDIUM

**What goes wrong:**
Ops bot sends a message per booking event. A bug or malicious actor creates 1,000 bookings. Bot sends 1,000 Telegram messages. Rate limit hit → Telegram blocks the bot token for the tenant. Or: actual staff Telegram group becomes unreadable with spam.

**How to avoid:**
1. Rate limit messages per chat_id per minute (Telegram official: 30/sec, 20/min for groups)
2. Coalesce high-frequency events into digests ("12 bookings created in last 15 min") — don't 1:1 map events to messages
3. Kill switch: single flag to disable all Telegram sending per tenant
4. Dedupe: same event type + entity_id within 1-minute window → 1 message
5. Circuit breaker: 3 consecutive Telegram API errors → pause sending for that tenant for 15 min

**Phase to address:** Sprint 3 (already in accommodation automation; audit in v3.0 pre-launch)

---

### Pitfall 19: Voice "stale as business evolves"

**Severity:** MEDIUM

**What goes wrong:**
Brand voice captured during onboarding (day 3). Client evolves positioning 3 months later. Voice doc never updated. Content feels off — client manually edits every output, gets frustrated.

**How to avoid:**
1. Quarterly prompt to client: "Is your brand voice still accurate? Review →"
2. Voice versioning: `brand_voice_versions` table; new version doesn't delete old
3. Easy way to regenerate voice from recent content samples (5-min flow)
4. A/B: offer "refresh voice from your last 30 days of posts" option — low-friction update

**Phase to address:** Sprint 2, Phase 03 (Brand Voice); quarterly reminder is a cron task

---

### Pitfall 20: Mobile-first failures (SA market)

**Severity:** MEDIUM to HIGH

**What goes wrong:**
SA SME owners are predominantly mobile-first. Dashboard built desktop-first (common for B2B SaaS). Owner tries to check Sunday brunch campaign on phone, can't navigate, complains. Pricing page doesn't load well on 3G, bounce rate high.

**How to avoid:**
1. Mobile-first design verification: every page tested at 360px width
2. Tailwind breakpoints: default (mobile) styles are the primary design; `md:`/`lg:` are enhancements
3. Test on actual SA-representative devices via BrowserStack (not just Chrome DevTools)
4. Touch targets ≥44px (Apple HIG minimum)
5. Pricing page, checkout, dashboard: lazy-load non-critical JS; critical path <100KB gzipped

**Phase to address:** Sprint 5 (Site Redesign) and ongoing

---

### Pitfall 21: Two-layer state during Easy→Advanced transition causes lost edits

**Severity:** MEDIUM

**What goes wrong:**
User opens Easy view, makes 5 changes, switches to Advanced "to see more options", discovers Advanced view reset their 5 changes. Saves Advanced. Their 5 changes from Easy are gone.

**How to avoid:**
1. Unified draft state (see Pitfall 7) — view switch persists pending edits
2. "You have unsaved changes" dialog on view switch
3. Easy view's "Save" button always writes to the same endpoint as Advanced's Save
4. State held in React Query / form lib at page level, not per-view component

**Phase to address:** Sprint 2, Phase 05 (Easy/Advanced Shell)

---

## Minor Pitfalls

### Pitfall 22: Setup fee + recurring amount combination on PayFast

**What goes wrong:** PayFast doesn't natively support "R500 one-time + R1500/mo recurring" as a single checkout. You'd configure a one-off + a subscription separately, client pays twice, confused.

**How to avoid:** Either make setup fee part of first month's invoice (amount=R2000 first billing, R1500 thereafter — needs subscription amount update after first cycle), or explicitly show two-payment UX and honest copy. Prefer first-month-loaded over two-transaction — clearer for customer.

**Phase to address:** Sprint 1 (Pricing Migration)

---

### Pitfall 23: Monthly reset boundary bugs (timezone, leap year, Feb 29)

**What goes wrong:** "Monthly" in server time (UTC) vs client time (SAST, UTC+2) means a client sees "month reset" 2 hours earlier than expected. Feb 29 edge case (2028 is next leap): `new Date(2028, 1, 29)` → ambiguous.

**How to avoid:** All monthly windows use `date-fns-tz` with `Africa/Johannesburg`. Unit test Feb 28, Feb 29, Mar 1. Monthly reset = "first moment of month 1 in tenant TZ"; not hour-based arithmetic.

**Phase to address:** Sprint 2 (Usage Caps)

---

### Pitfall 24: 3-day promise measured from signup vs from saga success

**What goes wrong:** Client signs up Friday 18:00. Saga completes Saturday 10:00. "Day 3" — is it Sunday (from signup) or Tuesday (from saga)? Ambiguity breeds distrust.

**How to avoid:** Define publicly: "3 business days from payment confirmation, provisioning starts the next business day." Be honest about weekends. Send timestamped progress emails.

**Phase to address:** Sprint 2 (Onboarding Promise)

---

### Pitfall 25: PayFast sandbox vs production passphrase signatures differ

**What goes wrong:** Production requires passphrase; sandbox works without. Moving from sandbox to prod without setting `PAYFAST_PASSPHRASE` → all ITN signature validations fail silently (logged as warning, not error — see `lib/payments/payfast.ts:229`). Payments go through at PayFast but your webhook rejects them.

**How to avoid:** Startup assertion (see Pitfall 11). Production health check that signs+validates a known payload and confirms match.

**Phase to address:** Sprint 1, Phase 01

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code new prices in `PRICING_TIERS_V3` without snapshot migration | Ship pricing page today | Every future price change risks Pitfall 1 | NEVER for v3.0 commercial launch |
| Skip atomic-increment; use read-then-write for usage caps | 30 min faster | Pitfall 5 (concurrency bypass) hits within first 10 paying clients | NEVER — infinite downside |
| Feature-flag new modules client-side only | Ship UI first | Pitfall 15 (unpaid access) | Only in a dev/staging env with no real customers |
| Keep legacy `starter/professional/enterprise` tier names in new code | "Keeps things working" | `TIER_MAP` confusion causes gate-check bugs | Only in migration scripts, never in new code |
| Emit Anthropic calls without token tracking | "We'll add it later" | Pitfall 3 (cost runaway) is existential | NEVER — add tracking before first call |
| Skip prompt-cache-hit instrumentation | "Anthropic handles it" | Pitfall 16 (silent 10x cost) | NEVER |
| Store brand voice raw (with PII) | Easier onboarding | Pitfall 4 (POPI breach) | NEVER |
| Use `DELETE FROM organizations` as rollback | Simple to implement | Destroys audit trail, breaks on related FKs without CASCADE, incident response nightmare | Only in pre-launch with no real orgs; replace before first paying client |
| Hard-code VAT rate 15% | "It's been 15% for years" | Pitfall 6 when SARS changes rate | NEVER |
| Use Vercel env UI as source of truth | Fast iteration | Pitfall 11 (drift, misconfiguration) | Only alongside a schema-validator that runs at startup |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **PayFast ITN** | Trust `payment_status=COMPLETE` without server-to-server verification | Call `verifyPayFastPayment` (already exists in `payfast.ts:351`) — always |
| **PayFast subscription update** | Assume app deploy updates PayFast-side amount | Explicitly call subscription update API; store `pf_token` per org |
| **PayFast signature** | Forget passphrase in production (defaults to empty) | Startup assert `PAYFAST_PASSPHRASE` set when `PAYFAST_MODE=production` |
| **Anthropic** | Default to Sonnet/Opus because "better quality" | Enforce Haiku 4.5 for cost-sensitive paths; unit economics require it |
| **Anthropic caching** | Assume cache "just works" | Verify ≥4,096 tokens for Haiku 4.5, instrument cache_read_tokens |
| **Anthropic workspaces** | Rely on cross-tenant cache isolation | Add org_id to cache-key-determining prefix; test with paired tenants |
| **Resend** | Send from `draggonnb.online` without SPF/DKIM/DMARC | Verify DNS records, warm-up domain, mail-tester before launch |
| **Resend** | Use same domain for transactional + marketing | Separate subdomains to isolate reputation |
| **N8N** | Assume webhook registration survives n8n restart | Idempotent registration at provisioning step 5; cron to re-register if drift |
| **Telegram Bot** | Ignore rate limits (30 msg/sec, 20/min to same group) | Queue + coalesce; circuit breaker on 429 |
| **Facebook/LinkedIn tokens** | Ignore expiry until user complains | Daily cron checks `expires_at`, alerts 7 days ahead |
| **Supabase RLS** | Change policy without checking existing tables with `FORCE RLS` | Read `.planning/codebase/CONCERNS.md` before any policy edit; test in branch |
| **Vercel deploys** | Assume code deploy and DB migration are atomic | Multi-step migration pattern (add nullable → deploy code → backfill → tighten) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `get_user_org_id()` miss-cached per request | Every RLS query does a user lookup | Ensure function marked STABLE (it is); verify with EXPLAIN ANALYZE | Always under load; caught in staging |
| Anthropic call in hot path (page render) | TTFB >3s on dashboard | Move AI to background job, stream results, cache aggressively | At ~10 concurrent users |
| Full-tenant queries without org_id filter | Timeouts on dashboard-level queries | Every query includes `organization_id = $1`; index on it | At ~500 rows per tenant |
| N+1 on accommodation bookings + guest + unit | Listing page takes 8s | Single query with JOIN + `select('...')` (Supabase joined query pattern); cast through `unknown` as documented in CLAUDE.md | At ~100 bookings per tenant |
| Read-heavy `tenant_modules` lookup on every request | Middleware latency rises | Edge-cached module list injected into headers (already done — keep it) | At ~1000 req/min |
| Large brand-voice prompt bloats every AI call | Monthly bill surprise | Cap voice at ~4,500 tokens; keep essential parts only; cache | After 3+ months of voice iteration |
| Monthly usage aggregation scans full history | Cap check takes >500ms | Pre-aggregate monthly in `usage_ledger`; index on (org_id, month, resource) | At ~10k events per tenant per month |

---

## Security Mistakes (domain-specific, beyond OWASP)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Brand voice contains PII sent to Anthropic | POPI Act breach, notification obligation, fines | Pre-send scrubbing of names/emails/phones; document retention policy; DPA with Anthropic (check current Anthropic data usage terms) |
| Receipt OCR uploads stored without retention limit | Indefinite PII retention = POPI violation | Auto-delete originals after OCR+verify; retain structured extract only |
| Multi-tenant RLS policy references wrong column on join | Cross-tenant data leak | Integration test: seed two tenants, assert queries as tenant A never return tenant B rows (for every table) |
| Service role key in client-side code | Full DB bypass | Audit: grep for `SUPABASE_SERVICE_ROLE_KEY` in `app/` (must be zero in client components); only in `api/`, `lib/` server-side |
| PayFast webhook not signature-verified | Fake "paid" events activate unpaid orgs | `validatePayFastSignature` + `verifyPayFastPayment` on every ITN; reject on fail — no "let it through to debug" |
| Brand voice includes secrets (passwords, API keys user pasted) | Leaked via Anthropic training (historically unclear) + prompt cache | Input sanitizer flags common secret patterns (AKIA*, eyJ*, sk-*, ghp_*) and refuses |
| Org-switching UI allows operator to act as a tenant without audit | Trust violation | Every "act as tenant" action logged to `operator_audit_log` with operator_id, tenant_id, timestamp, action |
| Telegram bot token leaks in logs | Anyone can impersonate the tenant's bot | Never log `token` fields; redact in Sentry/logging config |
| PayFast `custom_str*` fields used for sensitive routing | Visible to PayFast; any attacker who sees URL | Use only as lookup keys (`org_id`), never values (`plan_tier` is fine as it's public) |
| `organization_id` in URL without server-side verify | IDOR | Always re-verify `user.org_id === url.org_id` in API route (middleware header is *injection*, not *authorization*) |

---

## UX Pitfalls (domain-specific for SA SME)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Upgrade to continue" with no price shown | User abandons | Show exact R-amount, prorated if mid-cycle, what they unlock |
| Receipt upload fails silently on 3G | User thinks it uploaded | Progress indicator + explicit success/failure toast; retry button |
| Generic "Something went wrong" errors | User can't self-serve | Distinct error codes mapping to specific guidance ("your card was declined — [try another]") |
| Generated content with American spellings (color/organize) | Clients embarrassed | System prompt enforces SA English (colour/organise); integration test |
| US dollar amounts leaking through | Confusing / unprofessional | Currency guard in i18n layer; never hard-coded "$" |
| "Click here" copy | Unfriendly + bad for accessibility | Descriptive link text |
| Calendar week starts Sunday | SA/EU users expect Monday | Set `weekStartsOn: 1` in all date-fns calls |
| Phone input without +27 prefix | Invalid data | Intl phone input with ZA default |
| VAT shown as "Tax" | SA context requires VAT | Label explicitly "VAT (15%)" everywhere |
| Scale tier called "Enterprise" | Scares SMEs | "Scale" is better (already done in v3); keep it |
| "Cancel anytime" hidden in ToS | Perceived lock-in | Visible on pricing page + dashboard |

---

## "Looks Done But Isn't" Checklist

Verify these before declaring a feature shipped:

- [ ] **Pricing migration:** Snapshot column added, ITN handler reads from snapshot, 8 existing orgs audited, migration plan per-org documented, PayFast subscription-update API integrated (even if first use is manual)
- [ ] **Brand voice:** Integration test with two tenants showing different outputs, cache hit rate monitored, PII scrubber in place, voice length in 4,096-token cache-eligible window
- [ ] **Usage caps:** Atomic increment tested under concurrency, soft warnings at 50/75/90%, self-service upgrade path at 100%, monthly reset respects tenant TZ
- [ ] **Campaign Studio:** Publish confirmation UI shows target account, token-expiry monitor runs daily, kill switch tested, post-publish verification fetches from platform
- [ ] **Finance module:** Disclaimer on every output, VAT rate from DB (not hard-coded), zero-rating requires evidence + flag, audit log entries per calculation, accountant review gate for early tenants
- [ ] **Provisioning saga:** Per-step state persisted, failures pause not cascade-delete, operator alerts, steps 5-9 idempotent, health checks before start
- [ ] **Anthropic integration:** Per-tenant spend tracking live, circuit breaker at tier ceiling, Haiku 4.5 enforced as default, cache-hit rate monitored, tenant-scoped cache-key pattern verified
- [ ] **Env vars:** Startup assertion against Zod schema, production `PAYFAST_MODE` check, env-health endpoint, schema version in CI
- [ ] **Migrations:** Multi-step pattern (nullable → code → backfill → tighten), RLS policies tested in Supabase branch, runbook per migration
- [ ] **Site redesign:** Search Console baseline exported, 301 redirects for every renamed URL, Core Web Vitals budget met on 3G simulation, mobile-first verified at 360px
- [ ] **Resend/email:** SPF/DKIM/DMARC configured, mail-tester score 9+/10, tested inbox placement at MWEB + Gmail + Yahoo, plain-text alternative, unsubscribe link
- [ ] **Feature gates:** Middleware + API + RLS (defense in depth), integration test per module, daily audit cron
- [ ] **Telegram bot:** Rate limits respected, coalescing for high-freq events, kill switch, circuit breaker on 429

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Pricing mismatch (Pitfall 1) | MEDIUM if caught <24h | (1) Pause PayFast ITN processing, (2) audit affected orgs, (3) backfill snapshot retroactively, (4) replay rejected ITNs, (5) resume. If >24h: per-customer refund/credit. |
| PayFast-side desync (Pitfall 2) | MEDIUM | Call subscription-update API per affected sub; if auto-cancelled, customer re-subscribes (offer one month free as apology) |
| Anthropic cost runaway (Pitfall 3) | HIGH to CATASTROPHIC | (1) Immediate: kill the agent or tenant at API-key level, (2) audit usage logs, (3) if tenant-abuse: offer upgrade or terminate ToS, (4) if bug: hotfix + retro-limit |
| Cache key collision (Pitfall 4) | CATASTROPHIC | (1) Immediate: disable brand-voice feature platform-wide, (2) incident response POPI notification within 72h if PII exposed, (3) rebuild with tenant-scoped cache, (4) forensic review of generations |
| Cap-counter race (Pitfall 5) | MEDIUM | (1) Reconcile `usage_ledger` with actual resource counts, (2) issue credits for over-cap usage billed, (3) ship atomic-increment hotfix |
| Finance audit (Pitfall 6) | CATASTROPHIC | (1) Subject-matter lawyer, (2) accept liability if our output caused error, (3) provide client full audit trail + remediation, (4) disable auto-gen until reviewed |
| View desync (Pitfall 7) | LOW to MEDIUM | Bug fix + customer apology; usually single-user impact |
| Wrong-account post (Pitfall 8) | HIGH | (1) Delete offending post via platform API, (2) publicly apologize if needed, (3) post-mortem to client, (4) add guard to prevent class |
| Cap-hit at bad moment (Pitfall 9) | MEDIUM | One-time overage grant + apology + ship overage-buy flow |
| Saga failure (Pitfall 10) | MEDIUM | Operator resumes manually via admin tool; communicate honestly |
| Env misconfig (Pitfall 11) | MEDIUM to HIGH | Identify, fix env var, redeploy; refund if customer impact |
| Migration break (Pitfall 12) | HIGH | Supabase point-in-time restore (last resort); pg_dump + manual fix; never skip backup-before-migrate |
| SEO drop (Pitfall 13) | MEDIUM | Add retroactive redirects; resubmit sitemap; usually recovers in 30-60 days |
| Deliverability (Pitfall 14) | MEDIUM | Warm-up pause, SPF/DKIM/DMARC fix, support ticket per affected user |
| Feature gate leak (Pitfall 15) | MEDIUM | Revoke access + apology; if customer used extensively, grandfather for remainder of billing cycle |

---

## Pitfall-to-Phase Mapping (for roadmap sequencing)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. PRICING_TIERS mutation | Sprint 1 / Phase 01 (Pricing Migration Foundation) | Snapshot column exists; ITN reads from it; unit test: change price, old subs still validate |
| 2. PayFast state desync | Sprint 1 / Phase 01 | Subscription update API wrapper exists; integration test with sandbox; operator runbook |
| 3. Anthropic cost runaway | Sprint 1 / Phase 02 (Unit Economics Guards) | Per-tenant tracking live; circuit breaker test; tier ceiling enforced before any v3.0 AI feature ships |
| 4. Cache key collision | Sprint 2 / Phase 03 (Brand Voice) | Two-tenant integration test in CI; PII scrubber unit-tested |
| 5. Cap-counter race | Sprint 2 / Phase 04 (Usage Caps) | 50-concurrent-request test; Postgres atomic increment pattern used everywhere |
| 6. Tax-calc error | Sprint 4+ (Embedded Finance) | Every output has disclaimer; accountant-review gate for first 3 tenants; rates from DB table |
| 7. Easy/Advanced desync | Sprint 2 / Phase 05 (Easy/Advanced Shell) | Integration test: edit in one, visible in other; draft persistence test |
| 8. Wrong-account post | Sprint 3 (Campaign Studio) | Publish confirmation UI; post-publish verify; token-expiry cron; kill switch |
| 9. Cap-hit bad moment | Sprint 2 / Phase 04 (Usage Caps) | Soft warnings shipped; overage purchase flow; timezone test for monthly reset |
| 10. Provisioning failure | Sprint 1 or Sprint 2 (Onboarding Promise) | Saga state machine; operator alerts; idempotent steps 5-9; failure demo in staging |
| 11. Env misconfig | Sprint 1 / Phase 01 | Startup assertion with Zod; production `PAYFAST_MODE` check; `/api/ops/env-health` |
| 12. Migration break | Every sprint (discipline) | Multi-step migration checklist in CLAUDE.md; Supabase branch used; runbook per migration |
| 13. SEO regression | Sprint 5 (Site Redesign) | Search Console baseline + diff; 301s for every renamed URL; CWV budget in CI |
| 14. Deliverability | Sprint 2 (Onboarding Promise) | mail-tester score ≥9; MWEB inbox test; plain-text alternative; warm-up plan |
| 15. Feature gate leak | Every sprint adding modules | Integration test per feature (Core tenant gets 403); daily audit cron |
| 16. Cache-hit miss | Sprint 2 / Phase 03 | `cache_read_tokens` instrumentation; alert on <60% hit rate |
| 17. OCR cost scale | Sprint 4+ | Per-tier OCR cap; image-hash dedupe; downsampling |
| 18. Telegram flood | Sprint 3 (or audit existing) | Rate limiter test; coalescing under load; circuit breaker |
| 19. Voice stale | Sprint 2 / Phase 03 + ongoing cron | Quarterly "refresh voice" prompt; voice versioning table |
| 20. Mobile-first fail | Sprint 5 (Site Redesign) + ongoing | 360px smoke test per page; SA-device testing |
| 21. Easy/Advanced edits lost | Sprint 2 / Phase 05 | Unsaved-changes dialog; unified draft state |
| 22. Setup fee + recurring | Sprint 1 / Phase 01 | Decide: first-month-loaded UX; document in pricing-page copy |
| 23. Monthly reset bugs | Sprint 2 / Phase 04 | Feb 28/29/Mar 1 unit tests; timezone-aware reset |
| 24. 3-day clock ambiguity | Sprint 2 (Onboarding Promise) | Public-facing copy defines start/end; progress emails timestamped |
| 25. PayFast passphrase | Sprint 1 / Phase 01 | Startup assertion; prod health check signs+validates |

---

## Sources

- `lib/payments/payfast.ts` (current pricing implementation)
- `.planning/PROJECT.md` (platform scale, module inventory)
- `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/CONCERNS.md` (existing integration state)
- `n8n/wf-billing-monitor.json` (existing billing workflow)
- `Architecture/RECURRING_BILLING_WORKFLOW.md` (recurring billing design)
- [Payfast Subscriptions API overview](https://payfast.io/features/subscriptions/) — confirms update/pause/cancel supported via dashboard + API
- [Payfast Developer API](https://developers.payfast.co.za/api) — subscription update endpoint reference
- [Claude API Pricing 2026](https://platform.claude.com/docs/en/about-claude/pricing) — Haiku 4.5 at $1/$5 per 1M tokens
- [Claude Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — Haiku 4.5 requires 4,096-token minimum; workspace-level isolation from 2026-02-05
- [Anthropic API Pricing 2026 breakdown (finout.io)](https://www.finout.io/blog/anthropic-api-pricing) — cache write 1.25x/2x base, read 0.1x base
- [SARS VAT 411 Guide for Entertainment, Accommodation and Catering](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/LAPD-VAT-G04-VAT-411-Guide-for-Entertainment-Accommodation-and-Catering.pdf) — standard rating of SA-consumed accommodation
- [Avalara: South Africa VAT Compliance](https://www.avalara.com/us/en/vatlive/country-guides/africa-and-middle-east/south-africa/south-africa-vat-compliance-and-rates.html) — 15% rate maintained from 1 May 2025 (proposed 2026 hike withdrawn)
- [IPTGSA: VAT on Services to Foreign Tourists](https://www.iptgsa.org/SARS) — common zero-rating misconception clarified
- Telegram Bot API rate limits (30 msg/sec overall, 20/min per group) — standard Telegram docs
- POPI Act Section 22 (breach notification obligations) — SA Information Regulator

---

*Pitfalls research for: DraggonnB OS v3.0 commercial launch*
*Researched: 2026-04-24*
*Researcher confidence: HIGH on verified facts (PayFast API capabilities, Anthropic pricing, SARS VAT treatment, existing codebase state); MEDIUM on brand-voice cache behavior (extrapolated from Anthropic workspace-isolation docs)*
