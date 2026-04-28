---
phase: 12
plan_id: 12-08
title: Module-focused public landing redesign (5+1 modules pulled from docs/modules)
wave: 3
depends_on: [12-02]
files_modified:
  - components/landing/sections.tsx
  - components/landing/hero-section.tsx
  - components/landing/module-grid.tsx
  - components/landing/module-card.tsx
  - app/page.tsx
  - lib/landing/module-content.ts
  - public/images/modules/
  - __tests__/components/landing/module-grid.test.tsx
autonomous: false
estimated_loc: 500
estimated_dev_minutes: 180
---

## Objective

Redesign the public landing page around the 5+1 module narrative captured in `docs/modules/*.md`: **Accommodation · Restaurant · Trophy OS · Elijah · CRM+Campaign · Other**. Each gets a card that pulls headline + bullets + outcome metric directly from the module one-pager. The current landing leads with feature lists; the new one leads with "which kind of business are you?" and lets the prospect self-select.

Per CONTEXT.md decisions: pull copy from `docs/modules/*.md`, feature 5+1 modules. Phase 11 backlog candidate now in scope.

Includes a human-verify checkpoint since this is the public face of the platform.

## must_haves

**Truths:**
- A first-time visitor lands on `/` and sees a hero (existing — keep) followed by a "Pick your business type" module grid with 6 cards (5 verticals + Other catch-all).
- Each card has: title, 1-line value prop, 3 outcome bullets, "Learn more →" link to a per-module section deeper on the page (or to a per-module landing page if one exists).
- Card content is sourced from `docs/modules/*.md` parsed at build time (or hand-mirrored to a TS constant — pick whichever is faster).
- Cards are tappable end-to-end (not just the title link).
- Mobile-first: at 360px, cards stack 1-up; at 768px+ they grid 3-up; at 1280px+ 3-up still (avoid 6-up wide).
- The promised-vs-delivered audit (12-02) is honoured — claims pulled from docs/modules must match shipped capability. Any mismatch flagged for v3.1.

**Artifacts:**
- `lib/landing/module-content.ts` — TS constant array of `{ id, title, valueProp, bullets, learnMoreHref, icon, image? }`. Sourced from docs/modules but hand-mirrored to avoid runtime markdown parsing.
- `components/landing/module-grid.tsx` — RSC rendering all 6 cards.
- `components/landing/module-card.tsx` — client component (hover + tap analytics).
- `components/landing/sections.tsx` — refactored: drop the current generic feature-list section, replace with `<ModuleGrid />`.
- `app/page.tsx` — landing page imports the new grid.

**Key links:**
- Trophy OS section is included in the grid even though it's a separate product workstream (per docs/modules/trophy-os.md). The "Learn more →" link routes to the Trophy OS section / external page; do NOT promise full integration.
- Each card's claims must pass the 12-02 audit. If a module's docs/modules/*.md has a claim that's flagged "Removed" in the audit, drop it from the card too.
- Image assets: keep current Lucide icon placeholders unless docs/modules/*.md has an image referenced. No new asset shoot in this plan.

## Tasks

<task id="1">
  <title>Build module-content data + module-grid + module-card components</title>
  <files>
    lib/landing/module-content.ts
    components/landing/module-grid.tsx
    components/landing/module-card.tsx
    __tests__/components/landing/module-grid.test.tsx
  </files>
  <actions>
    1. Open each `docs/modules/*.md`:
       - accommodation.md
       - restaurant.md
       - trophy-os.md
       - elijah-security.md
       - crm.md (combine with email-marketing.md + campaign-studio.md as "CRM + Campaign")
       - (catch-all "Other" — write fresh; covers Content Studio + AI agents + Analytics + Autopilot)

       Extract the title, the 1-line value prop, and the 3 strongest outcome bullets from each.

    2. Build `lib/landing/module-content.ts`:
       ```typescript
       export interface ModuleCardContent {
         id: string
         title: string
         valueProp: string
         bullets: string[]   // exactly 3
         learnMoreHref: string
         icon: string        // lucide icon name
         tone: 'crimson' | 'charcoal' | 'amber' | 'blue' | 'pink' | 'emerald'
       }
       export const MODULE_CARDS: ModuleCardContent[] = [
         {
           id: 'accommodation',
           title: 'Accommodation',
           valueProp: 'Run your lodge, BnB or guesthouse on autopilot.',
           bullets: [
             'AI guest-comms across email + WhatsApp',
             'Auto-quoting + brand-voice driven concierge',
             'Per-unit cost + occupancy tracking',
           ],
           learnMoreHref: '#accommodation-detail',
           icon: 'Building',
           tone: 'crimson',
         },
         { id: 'restaurant', ... },
         { id: 'trophy-os', ... },
         { id: 'elijah', ... },
         { id: 'crm-campaign', ... },
         { id: 'other', ... },
       ]
       ```

       Cross-reference with the 12-02 audit. Any bullet that audit flagged Removed → leave it out. Bullets must be present-tense ("AI does X") not aspirational ("AI will do X").

    3. `components/landing/module-grid.tsx` — RSC:
       ```typescript
       import { MODULE_CARDS } from '@/lib/landing/module-content'
       import { ModuleCard } from './module-card'
       export function ModuleGrid() {
         return (
           <section className="px-6 py-16">
             <div className="mx-auto max-w-7xl">
               <h2 className="text-3xl font-bold mb-8">Built for your business</h2>
               <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                 {MODULE_CARDS.map(c => <ModuleCard key={c.id} card={c} />)}
               </div>
             </div>
           </section>
         )
       }
       ```

    4. `components/landing/module-card.tsx` — client component for hover + tap analytics. Renders icon + title + valueProp + 3 bullets + "Learn more →" link. The whole card is a `<Link>` wrapping the children.

    5. Tests in `__tests__/components/landing/module-grid.test.tsx`:
       - case: renders 6 module cards.
       - case: each card has title, valueProp, exactly 3 bullets, learnMoreHref.
       - case: card click routes to learnMoreHref.
       - case: hover state applies tone-specific styles.
  </actions>
  <verification>
    - `npm test -- module-grid` passes ≥4 tests.
    - `lib/landing/module-content.ts` has exactly 6 entries.
    - Each card's bullets cross-reference cleanly with the 12-02 audit (Kept dispositions).
  </verification>
</task>

<task id="2">
  <title>Refactor sections.tsx + landing page to feature ModuleGrid</title>
  <files>
    components/landing/sections.tsx
    app/page.tsx
  </files>
  <actions>
    1. Open `components/landing/sections.tsx`. Identify the current "features" or "what we do" section. Replace it with `<ModuleGrid />`.

    2. If `app/page.tsx` is the landing entry: confirm it renders `<ModuleGrid />` near the top (after hero, before pricing CTA). The desired sequence:
       ```
       <HeroSection />        // existing — keep
       <ModuleGrid />          // NEW — pick-your-business
       <TrustTrio />          // existing — "3 business days · pay in Rands · cancel anytime"
       <PricingPreview />     // existing
       <CTASection />         // existing
       ```

    3. For each module card with `learnMoreHref` like `#accommodation-detail`, add a section deeper on the page with that ID — even a brief 100-word section is enough at launch. Pull copy from docs/modules/{module}.md "Why it matters" or "Outcomes" section. (Anchor scroll lands the user there.)

    4. Verify the visual hierarchy reads: hero → "Built for your business" grid → trust trio → per-module deeper sections → pricing → CTA. No orphaned sections.

    5. Run `npm run build` — landing page renders.
  </actions>
  <verification>
    - `npm run build` clean.
    - Manual at desktop + 360px: landing page renders, module grid is visible, each card is tappable, anchor scroll works.
    - 12-02 audit re-applied: every claim on the new landing still passes.
  </verification>
</task>

<task id="3" type="checkpoint:human-verify" gate="blocking">
  <what-built>Module-focused public landing with a 6-card grid (Accommodation · Restaurant · Trophy OS · Elijah · CRM+Campaign · Other) sourced from docs/modules/*.md and audited against 12-02.</what-built>
  <how-to-verify>
    1. Open the staging Vercel URL (logged-out browser).
    2. Confirm the grid renders 6 cards with consistent card heights.
    3. Click each card → either anchor-scrolls to the per-module section OR navigates to a per-module landing page.
    4. Resize browser: 1280 → 768 → 360. Confirm grid responds (3-up → 2-up → 1-up).
    5. On 360px: each card is tappable end-to-end (no truncation, no horizontal scroll).
    6. Each card's bullets read as truthful claims about shipped product (no fabrications, no aspirational "will do" language).
    7. The page sequence is hero → grid → trust trio → per-module sections → pricing → CTA, in that order.
    Type "approved" if all 7 pass.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

## Verification

- `npm run build` clean.
- `npm test` clean.
- Module grid renders at all 3 breakpoints (1280, 768, 360).
- Audit doc 12-02 re-checked against the redesigned page; no new drift introduced.

## Out of scope

- New hero illustrations / photography. Lucide icons only.
- Per-module landing pages with deep content. The anchor-scroll deeper sections at launch are 100-word stubs; full per-module pages are v3.1.
- A/B testing infrastructure for the new layout — measurement happens by Vercel Analytics + Search Console, no in-app experiment gating.
- Internationalization. English only per OOS list in REQUIREMENTS.md.

## REQ-IDs closed

None directly. This is the module-focused landing redesign captured in CONTEXT.md as Wave 4 backlog candidate (now in Wave 3 scope).
