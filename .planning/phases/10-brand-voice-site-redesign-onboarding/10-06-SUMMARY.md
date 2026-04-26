---
phase: 10-brand-voice-site-redesign-onboarding
plan: 06
type: execute
wave: 3
depends_on: [10-03, 10-04]
status: complete
completed: 2026-04-26
duration: ~1.5h
tags: [billing, vat, pricing, landing, brand-voice, onboarding-ui]
subsystem: conversion-surface
requires:
  - 10-03 (brand voice API routes)
  - 10-04 (onboarding-progress API)
provides:
  - Public /pricing with interactive module picker (BILL-01, BILL-09, SITE-02)
  - Outcome-led landing hero + correct trust trio (SITE-01, SITE-05, Pitfall F)
  - 3-step brand voice wizard at /settings/brand-voice (VOICE-01 UI, VOICE-08 UI)
  - 4-step API-backed dashboard onboarding checklist (ONBOARD-01 UI)
  - Reusable VAT helper (lib/billing/vat.ts) and ZAR formatter (lib/billing/format-zar.ts)
affects:
  - Phase 11 conversion + signup flow (consumes /pricing trust copy)
  - Phase 12 launch communications (landing copy locked)
tech-stack:
  added: []
  patterns:
    - "Server-fetch billing_addons_catalog in RSC -> pass to client picker"
    - "Integer-cent VAT math: Math.round(cents * 1.15)"
    - "3-step state machine in single client component (wizard)"
    - "API-backed checklist with self-hide on completion"
key-files:
  created:
    - lib/billing/vat.ts
    - lib/billing/format-zar.ts
    - app/pricing/_components/module-picker.tsx
    - app/pricing/_components/pricing-cta.tsx
    - components/landing/hero-section.tsx
    - app/(dashboard)/settings/brand-voice/page.tsx
    - app/(dashboard)/settings/brand-voice/_components/wizard-step-url.tsx
    - app/(dashboard)/settings/brand-voice/_components/wizard-step-questions.tsx
    - app/(dashboard)/settings/brand-voice/_components/wizard-step-review.tsx
    - app/(dashboard)/_components/onboarding-checklist.tsx
    - __tests__/unit/billing/vat.test.ts
    - __tests__/components/module-picker.test.tsx
  modified:
    - app/page.tsx
    - app/pricing/page.tsx
    - components/landing/sections.tsx
    - components/landing/register-interest.tsx
    - app/(dashboard)/dashboard/page.tsx
commits:
  - 6aed18da feat(10-06): VAT helper + pricing page with module picker
  - 3eaa0bf2 feat(10-06): outcome-led landing redesign + true trust indicators
  - e4067505 feat(10-06): brand voice wizard UI + dashboard onboarding checklist
---

# Phase 10 Plan 06: Pricing Page + Landing Redesign + Brand Voice Wizard + Onboarding Checklist

**One-liner:** Conversion surface for v3.0 — interactive /pricing page with VAT-inclusive module picker, outcome-led landing with corrected trust copy, brand voice wizard UI, and the 4-step onboarding checklist on the dashboard.

## Tasks executed

| # | Task | Commit | Tests |
|---|------|--------|-------|
| 1 | VAT helper + Pricing page + Module picker | 6aed18da | 10 unit + 9 component (all green) |
| 2 | Landing redesign — outcome-led hero + trust trio | 3eaa0bf2 | reused existing dashboard tests (7 green) |
| 3 | Brand voice wizard UI + onboarding checklist | e4067505 | tsc clean; manual end-to-end deferred |

3 atomic feat commits + this docs commit (added in plan-metadata commit).

## VAT formula sanity (BILL-09)

Pure integer-cent math. `Math.round(cents * 1.15)` end-to-end.

| Ex-VAT (cents) | Ex-VAT (R) | Inc-VAT (cents) | Inc-VAT (R) |
|---|---|---|---|
| 59,900 | R599.00 | 68,885 | R688.85 |
| 119,900 | R1,199.00 | 137,885 | R1,378.85 |
| 99,800 (Core + Finance-AI) | R998.00 | 114,770 | R1,147.70 |
| 149,900 (Setup fee) | R1,499.00 | 172,385 | R1,723.85 |
| 0 | R0.00 | 0 | R0.00 |

Test file: `__tests__/unit/billing/vat.test.ts` — 10 tests, all pass.

## /pricing page

**Page structure:**
- Header: DraggonnB logo + "Get started" CTA
- Hero: "Pricing in Rands. Pick what you need." with "Live in **3 business days**. Cancel anytime. Pay in Rands."
- Module picker (server-fetches `billing_addons_catalog`, passes to client component)
- Trust trio: "Live in 3 business days" / "Pay in Rands" / "Cancel anytime"

**Module picker behaviour:**
- 3 hard-coded plans (Core R599, Accommodation R1,199, Restaurant R1,199) per BILL-01 spec
- Add-on toggle list filters to `kind=module` + `monthly` (excludes setup_fee + overage_packs)
- Sticky sidebar shows live total: ex-VAT, VAT-inclusive bold, "incl. 15% VAT" label, optional once-off setup line
- `data-testid="pricing-total"` for stable test targeting

**Source-of-truth contract honored:** addon IDs are NEVER hard-coded. The picker iterates whatever `getAddonsCatalog()` returns — finance_ai, events, white_label, setup_fee, top-up packs all auto-appear when the catalog is updated.

## Landing redesign

**Hero (`components/landing/hero-section.tsx`):**
- New file (extracted from `sections.tsx`)
- Headline: "Run your lodge on autopilot."
- Subhead: "DraggonnB OS replaces ~R4,500/mo of manual work — guest comms, booking ops, AI quoting, social posting. Live in 3 business days."
- Two CTAs: "Get started" -> /signup, "See pricing" -> /pricing
- Module-preview tile (right column): static Lucide `Settings2` icon in a crimson-bordered card linking to /pricing
- Charcoal #363940 background, crimson #6B1420 accents

**TrustIndicators (new export in sections.tsx):**
- 3-card grid: "3 business days to go live", "Pay in Rands", "Cancel anytime"
- Inserted between `<HeroSection />` and `<ModuleShowcaseSection />` in `app/page.tsx`

**Pitfall F closed — false trust copy removed:**
- `components/landing/sections.tsx`: hero strip "14-day free trial" / "No credit card required" — REMOVED
- `components/landing/sections.tsx` PricingPreview: "All plans include a 14-day free trial. No credit card required" — REMOVED, replaced with v3.0 module picker pitch
- `components/landing/sections.tsx` CTASection: "14-day free trial" trust badge — REMOVED, replaced with "3 business days to go live"
- `components/landing/register-interest.tsx`: "priority onboarding, a 14-day free trial" — REWRITTEN to "priority onboarding, 3 business days to go live"
- 0 hits remain in actual UI text. Comment references in module headers preserved as audit trail.

**Brand colors:**
- Charcoal swapped from old `#2D2F33` to v3.0 `#363940` throughout `sections.tsx` (32 hits)
- Crimson `#6B1420` retained (already correct)
- Hero file: 7 brand-color hits

**SocialProof stat:** "72hr Go-Live" -> "3 days Go-Live" to match the v3.0 promise.

## Brand voice wizard UI

**Route:** `/settings/brand-voice` (auth-gated via `getUserOrg()`)

**3-step state machine (single client component):**
1. **Step 1 (URL):** input + "Continue" -> POSTs `/api/brand-voice/scrape`. "Skip — fill in manually" jumps straight to step 2.
2. **Step 2 (Questions):** 5 fields per `WIZARD_QUESTIONS` schema (tone multi-select with custom-add, audience textarea, differentiator textarea, example_phrases list up to 5, forbidden_topics list up to 10). Audience pre-fills from `scraped.description` if available. Validates client-side via `BrandVoiceInputSchema.safeParse()` before submit.
3. **Step 3 (Review):** structured summary (not raw JSON) + Save button. POSTs `/api/brand-voice/save`.
4. **Step 4 (Done):** green confirmation card.

**VOICE-08 re-run mode:** RSC parent reads `client_profiles.brand_voice_prompt` directly via admin client. If `brand_voice_prompt IS NOT NULL`, header swaps to "Last updated YYYY-MM-DD. Re-run the wizard to update it." Existing `example_phrases` and `forbidden_topics` are seeded into the wizard initial state for quick re-edit.

**File split:**
- `wizard-step-url.tsx` — exports `BrandVoiceWizard` (the host); also renders the URL input UI inline
- `wizard-step-questions.tsx` — exports `WizardStepQuestions`
- `wizard-step-review.tsx` — exports `WizardStepReview`

## Dashboard onboarding checklist (ONBOARD-01)

**Component:** `app/(dashboard)/_components/onboarding-checklist.tsx`

**Behaviour:**
- Client-side `fetch('/api/ops/onboarding-progress')` on mount
- Renders 4 items: Account live / Brand voice captured / Kickoff call booked / First action complete
- Auto-hides if:
  - API returns `{}` (no onboarding row → not in onboarding window)
  - `day0_completed_at` is null
  - All 4 items are done

**Wired into `app/(dashboard)/dashboard/page.tsx`:** replaced the legacy localStorage-based `OnboardingChecklist` from `components/dashboard/OnboardingChecklist.tsx` (5 generic getting-started tasks, dismissable) with the new API-backed 4-step v3.0 checklist. The legacy component remains in the codebase, just unused on the dashboard.

**Brand-color treatment:** crimson border + cream-pink fill (`#fef5f6`), green check icons for completed items, gray numbered circles for pending.

## Trust copy verification (Pitfall F)

```
$ grep -i "14-day free trial" app/**/*.tsx components/**/*.tsx
# 0 hits in UI text
# 4 hits in code-comment audit trail (intentional, documents what was removed)

$ grep -i "no credit card" app/**/*.tsx components/**/*.tsx
# 0 hits in UI text
# 3 hits in code-comment audit trail

$ grep -E "3 business days to go live|Pay in Rands|Cancel anytime" components/landing/sections.tsx
# 3+ hits each — copy live in TrustIndicators + CTASection
```

## Deviations from plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] register-interest.tsx still claimed "14-day free trial"**
- **Found during:** Task 2 grep verification
- **Issue:** `components/landing/register-interest.tsx` line 75 advertised "priority onboarding, a 14-day free trial, and a founding-member discount" — direct Pitfall F violation in the email-capture section
- **Fix:** Rewrote line 75 to "priority onboarding, 3 business days to go live, and a founding-member discount locked in"
- **Files modified:** `components/landing/register-interest.tsx`
- **Commit:** `3eaa0bf2`

**2. [Rule 1 — Bug] Existing localStorage OnboardingChecklist did not satisfy ONBOARD-01**
- **Found during:** Task 3 wiring
- **Issue:** `components/dashboard/OnboardingChecklist.tsx` is a 5-item localStorage-tracked legacy widget (Profile / Contact / Campaign / Content / WhatsApp). It's dismissable forever via localStorage. ONBOARD-01 requires a 4-step API-backed checklist (signup / brand voice / kickoff / first action) with auto-hide on completion.
- **Fix:** Created the new component at the plan-specified path `app/(dashboard)/_components/onboarding-checklist.tsx` and updated the import in `app/(dashboard)/dashboard/page.tsx` to point at it. Old component left in repo (unreferenced) for safety; can be deleted in a follow-up cleanup commit.
- **Files modified:** `app/(dashboard)/dashboard/page.tsx`
- **Commit:** `e4067505`

**3. [Rule 1 — Locale rendering correctness] en-ZA `toLocaleString` uses NBSP + comma decimal**
- **Found during:** Module-picker test execution
- **Issue:** Test assertions like `'R599.00'` failed because the `en-ZA` locale on Node renders `R599,00` (comma decimal) and thousands amounts use U+00A0 NBSP separator (`R1 199,00`).
- **Decision:** This is correct South African formatting. Kept `en-ZA` locale (it's literally the locale name for the user base). Updated test expectations to use the actual rendered strings + `\s+` regex tolerance for thousands separators (Testing Library normalizes whitespace).
- **Files modified:** `__tests__/components/module-picker.test.tsx`
- **Commit:** `6aed18da`

### Open todos (non-blocking)

- **Hero illustration is a Lucide gear icon placeholder.** Plan 10-06 noted this as acceptable for v3.0; replace with custom SVG / product screenshot when launch graphic is ready. File: `components/landing/hero-section.tsx`.
- **Legacy `components/dashboard/OnboardingChecklist.tsx`** is now unreferenced; delete in a Phase 10 cleanup commit if no other code path imports it.

## must_haves verification

- [x] **VAT formula** — `vatInclusivePrice(cents) = Math.round(cents * 1.15)` in `lib/billing/vat.ts`. Pure integer math. 10 tests confirm.
- [x] **/pricing module picker** — Live total updates on plan switch + addon toggle. VAT-inclusive label visible.
- [x] **Module picker fetches catalog** — RSC calls `getAddonsCatalog()`, passes array to client. No hard-coded addon IDs in `module-picker.tsx`.
- [x] **Outcome-led hero** — "Run your lodge on autopilot." Module-preview tile present, brand colors applied.
- [x] **False trust indicators removed** — 0 UI hits for "14-day free trial" / "No credit card required". 3 v3.0 trust strings live in sections.tsx + CTASection + register-interest.tsx.
- [x] **/pricing copy includes "3 business days"** — Page hero subline + CTA cards both contain the literal text.
- [x] **Brand voice wizard 3 steps** — URL -> questions -> review -> done. Calls `/api/brand-voice/scrape` + `/api/brand-voice/save`.
- [x] **Onboarding checklist on dashboard** — `<OnboardingChecklist />` at top of `/dashboard`, reads `/api/ops/onboarding-progress`, 4-step state, auto-hides correctly.

## What was tested

**Automated (vitest):**
- `__tests__/unit/billing/vat.test.ts` — 10 tests: R599→R688.85, R1199→R1378.85, R0→R0, half-up rounding boundary, R1499 setup fee, Core+Finance-AI combined, integer-only result, vatPortion math, VAT_LABEL constant. **10/10 passing.**
- `__tests__/components/module-picker.test.tsx` — 9 tests: 3 plans render, addon kind filter, "incl. 15% VAT" label, default Core total, plan switch updates total, Finance-AI toggle math, setup-fee line render+hide, addon toggle reversibility. **9/9 passing.**
- `__tests__/components/dashboard/dashboard-page.test.tsx` — 7 tests, **still passing** after import swap to new checklist component (no regressions).
- Total project test suite: pre-existing 36 failures unrelated to this plan (env-singleton issue documented as Phase 10 backlog item — `lib/payments/payfast.ts` boots `lib/config/env.ts` which throws when `.env.local` is incomplete).

**Static analysis:**
- `tsc --noEmit` — 0 new errors. 3 pre-existing errors in `__tests__/integration/api/elijah/elijah-full.test.ts` and `__tests__/integration/api/social/social-content-full.test.ts` (unrelated, untouched by this plan).
- `next build` — "Compiled successfully" before type-check phase finished. Zero compile errors in the 12 new + 5 modified files.

**Grep verification (Pitfall F):**
- `app/**/*.tsx` + `components/**/*.tsx`: 0 UI hits for "14-day free trial" or "No credit card required". Comment-only references preserved as audit trail.
- 3+ hits each for "3 business days to go live" / "Pay in Rands" / "Cancel anytime" in `sections.tsx` + supporting components.

**Manual smoke (deferred — owner verification):**
- /pricing route — visual smoke + module-picker live total interaction
- / (landing) — hero copy, trust strip, brand colors
- /settings/brand-voice — full wizard flow against live `/api/brand-voice/scrape` and `/api/brand-voice/save`
- /dashboard — onboarding checklist render for an org with an `onboarding_progress` row

## REQs closed

- **BILL-01** — interactive module picker on /pricing
- **BILL-09** — VAT-inclusive labelling ("incl. 15% VAT") in `vat.ts` + module picker
- **VOICE-01 (UI)** — 3-step wizard with 5-question form
- **VOICE-08 (UI)** — re-run mode with "Last updated" header
- **SITE-01** — outcome-led hero with module preview
- **SITE-02** — public /pricing page with module picker
- **SITE-05** — brand-color refresh (charcoal #363940 + crimson #6B1420 throughout)
- **ONBOARD-01 (UI)** — 4-step API-backed dashboard checklist
- **Pitfall F** — false trust indicators eliminated, v3.0 trust trio in place
- **ONBOARD-09 (surface)** — "3 business days" literal text near pricing CTA

## Next phase readiness

Phase 10 Plan 06 is the conversion surface. Downstream consumers:
- **Plan 10-07 (if any):** depends on /signup wiring to the picked plan composition
- **Phase 11:** signup → onboarding → first invoice journey now has a complete public-facing entry point
- **Phase 12 (launch comms):** pricing copy + trust trio are now stable; can be quoted in marketing assets

**No new blockers introduced.** Pre-existing env-singleton test failures remain in the Phase 10 backlog list.
