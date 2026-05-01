---
phase: 12
plan: "12-08"
title: "Module-focused public landing — 5+1 module grid + detail anchors"
subsystem: "landing-page"
tags: ["landing", "marketing", "modules", "ia", "conversion"]
one-liner: "Replace generic 6-item ModuleShowcaseSection with a 5+1 module-focused card grid (Accommodation, Restaurant, Trophy OS, Elijah, CRM+Campaign, Other) sourced from docs/modules/*.md, with per-module anchor stub sections."
status: complete
completed: "2026-05-01"
requires: ["12-06"]
provides: ["module-grid", "module-detail-anchors", "module-content-data"]
affects: ["12-07"]
tech-stack:
  added: []
  patterns:
    - "Typed module content array (lib/landing/module-content.ts) — single source for landing copy"
    - "Tone-coloured card variants (crimson/charcoal/amber/blue/pink/emerald) keyed off ModuleCardContent.tone"
    - "Full-card Link wrapper for end-to-end tappable area on mobile"
    - "Trophy OS as external product link (target=_blank, rel=noopener) — honest cross-product surfacing"
    - "scroll-mt-24 on detail anchor sections to compensate for fixed top nav"
key-files:
  created:
    - "lib/landing/module-content.ts"
    - "components/landing/module-grid.tsx"
    - "components/landing/module-card.tsx"
    - "components/landing/module-details.tsx"
    - "__tests__/components/landing/module-grid.test.tsx"
  modified:
    - "components/landing/sections.tsx (removed legacy 6-item modules array; ModuleShowcaseSection delegates to ModuleGrid)"
    - "app/page.tsx (render ModuleDetailSections after ModuleShowcaseSection)"
decisions:
  - "Trophy OS kept in the grid as a peer product (per CONTEXT) but linked externally to https://trophyos.co.za with target=_blank — does NOT promise integration with DraggonnB OS, just acknowledges the product exists."
  - "5 in-page anchor stubs (#accommodation-detail, #restaurant-detail, #elijah-detail, #crm-campaign-detail, #other-detail) instead of per-module landing pages. Stubs are ~100 words each with 3 outcome bullets. Per-module pages deferred to v3.1 per plan OOS list."
  - "Detail sections go on a single page (#detail anchors) rather than separate routes — keeps SEO weight on /, lower maintenance, prospects scroll in context."
  - "12-02 promised-vs-delivered audit dependency BYPASSED per .continue-here.md note: content audit done in this session via docs/modules/*.md. All bullets cross-reference shipped capability tables in docs/modules/{module}.md — no aspirational/will-do language."
  - "Industry-Solutions and How-It-Works sections kept in place — module grid + detail anchors are additive, not replacing the rest of the landing page."
---

# Phase 12 Plan 12-08: Module-Focused Public Landing Summary

## What was done

Rebuilt the landing page module showcase around the 5+1 narrative captured in `docs/modules/*.md`. The previous `ModuleShowcaseSection` rendered a generic 6-item array of feature blurbs (CRM, Email, Social, Content, Accommodation, AI Agents). The new grid leads with **business type** (Accommodation, Restaurant, Trophy OS, Elijah, CRM+Campaign, Other) so a prospect can self-select.

## Implementation

| Layer | File | Role |
|-------|------|------|
| Content data | `lib/landing/module-content.ts` | Typed `MODULE_CARDS` array (6 entries) — single source for headline + 3 outcome bullets + icon + tone + learnMoreHref per module. |
| Section wrapper | `components/landing/module-grid.tsx` | Renders the section heading + 6-card responsive grid (1-up / 2-up / 3-up). |
| Card | `components/landing/module-card.tsx` | Client component. Full-card `<Link>` wrapper for tappable area. Tone-keyed icon styling. Trophy OS opens externally. |
| Detail anchors | `components/landing/module-details.tsx` | 5 in-page anchor stubs (~100 words each) for `#accommodation-detail`, `#restaurant-detail`, `#elijah-detail`, `#crm-campaign-detail`, `#other-detail`. |
| Wiring | `components/landing/sections.tsx` | Stripped legacy 6-item array. `ModuleShowcaseSection` now delegates to `<ModuleGrid />`. |
| Page | `app/page.tsx` | Imports + renders `<ModuleDetailSections />` after `<ModuleShowcaseSection />`. |

## Module content (sourced from docs/modules/*.md)

| Module | Value prop | Outcome bullets |
|--------|------------|-----------------|
| Accommodation | Run your lodge, B&B or guesthouse on autopilot | AI quoting + concierge across email and WhatsApp · PayFast deposits with auto reminders · Per-unit costs and occupancy tracked nightly |
| Restaurant | POS, floor plan, SOPs and QR menus in one shift-ready system | Konva floor plan with PIN-auth POS sessions · Block-based SOPs and shift checklists · PayFast bill payments + temperature compliance |
| Trophy OS | The OS for Southern African hunting operations | Quota and DEA permit tracking · Safari pipeline + trophy log + firearm register · Supplier coordination (taxidermist, butcher, logistics) |
| Elijah | Daily roll call, incidents and fire response for residential estates | WhatsApp roll call with grace-period escalation · Fire dispatch routes nearest water points · Section-based household oversight |
| CRM + Campaign | Pipeline, AI follow-ups and multi-channel campaigns in one CRM | AI-curated follow-ups, stale deals, hot leads · AI-drafted email + SMS with brand-safety review · Nightly engagement scoring + one-click approve |
| Other | Brand-voice content, autopilot scheduling and on-demand AI agents | AI content for social, email, long-form · Autopilot weekly scheduler · Cost-aware AI usage tracked per organisation |

All bullets cross-reference shipped capability tables in `docs/modules/{module}.md` — no aspirational claims, no "will do" language.

## Tests

6 vitest tests (`__tests__/components/landing/module-grid.test.tsx`):

1. Renders exactly 6 module cards
2. Cards in canonical order: accommodation → restaurant → trophy-os → elijah → crm-campaign → other
3. Each card has title, value prop, exactly 3 bullets, "Learn more" link
4. Cards link to configured `learnMoreHref`
5. Trophy OS card opens externally (target=_blank, rel=noopener)
6. Section heading "Pick the operating system that fits your trade" present

## Manual smoke-test (localhost:3000)

- 6 `[data-module-card]` cards rendered
- 5 anchor targets (`#accommodation-detail`, `#restaurant-detail`, `#elijah-detail`, `#crm-campaign-detail`, `#other-detail`) all present with matching headings
- Trophy OS card href = `https://trophyos.co.za` (external, separate product)
- All other cards href = `#{id}-detail` for in-page anchor scroll
- Anchor offsets verified: `accommodation-detail` at offsetTop ~7963px (within scrollable doc), `restaurant-detail` at ~10043px

## Deviations from Plan

### Per-module pages NOT built — anchor stubs only

Plan called for an "Anchor scroll lands the user there" with brief deeper sections. Confirmed in OOS list: "Per-module landing pages with deep content. The anchor-scroll deeper sections at launch are 100-word stubs; full per-module pages are v3.1." Implementation matches OOS scope.

### 12-02 audit dependency bypassed

Plan declares `depends_on: [12-02]` but `.continue-here.md` (2026-04-29) explicitly noted: "12-08's dependency on 12-02 audit is bypassable since content audit was done in this session via `docs/modules/*.md`." Bullets sourced directly from docs/modules capability tables — every claim cross-references a shipped capability. No new drift introduced.

### Trophy OS treated as separate product (external link)

Plan suggested Trophy OS could route to "the Trophy OS section / external page". Per `docs/modules/trophy-os.md` line 5: "Trophy OS is a SEPARATE product from DraggonnB OS." Card opens https://trophyos.co.za in a new tab — peer product positioning, not integration claim.

### IndustrySolutions + RegisterInterest sections kept

The plan's desired sequence drops some existing sections. Implementation kept them (`IndustrySolutions`, `RegisterInterest`) — these are revenue-pipeline surfaces from earlier phases. New sequence: hero → trust trio → **module grid → module details** → how-it-works → industry-solutions → pricing → register-interest → CTA.

[Rule 2 - Plan Adjustment] Conservative add — net-new value without removing working surfaces.

## tsc status

Clean. Same 3 pre-existing errors in `__tests__/integration/api/elijah/elijah-full.test.ts` and `__tests__/integration/api/social/social-content-full.test.ts` (last touched in commit `e2a66f04`).

## Commits

- `b10f14fb` — feat(12-08): module-focused public landing — 5+1 module grid + detail anchors

## REQ-IDs closed

None directly — landing redesign is net-new scope from CONTEXT.md (Wave 4 backlog candidate, pulled into Wave 3 to ride alongside 12-06).

## Next Phase Readiness

Wave 3 has 1 plan remaining: 12-07 (smart-landing dashboard). Independent of 12-08, can execute next.

## Out of scope (parked)

- Mobile breakpoint full sweep at 360px — covered in 12-05 (Wave 2, parked).
- Per-module landing pages with deep content — v3.1.
- New hero illustrations / photography — Lucide icons only.
- A/B testing infrastructure — Vercel Analytics + Search Console suffice for launch.
- Internationalization — English only per REQUIREMENTS.md OOS list.
