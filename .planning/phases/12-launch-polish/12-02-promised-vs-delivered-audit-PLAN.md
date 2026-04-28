---
phase: 12
plan_id: 12-02
title: Promised-vs-delivered audit (landing copy alignment)
wave: 2
depends_on: [12-01]
files_modified:
  - components/landing/sections.tsx
  - components/landing/hero-section.tsx
  - components/landing/industry-solutions.tsx
  - components/landing/register-interest.tsx
  - app/pricing/page.tsx
  - .planning/phases/12-launch-polish/12-02-AUDIT.md
autonomous: true
estimated_loc: 200
estimated_dev_minutes: 90
---

## Objective

Walk every public-facing claim on the landing page, pricing page, and signup flow and verify the underlying capability ships in code. Fix any drift in two ways: (a) tone copy down to match what is shipped, OR (b) flag the gap as a v3.1 trigger if the feature is genuinely on the roadmap. The Phase 10 SocialProof fabrication has already been removed (per STATE.md); this plan is a confirmation pass and net-new audit covering everything else — outcome claims, statistics, "AI 24/7", "unlimited", trust trio, and the trust-the-stats badges.

Purpose: Phase 11 closed under-budget on quality, and Phase 12's commercial gate is "platform's promises survive a prospect's first 10 minutes". Misaligned copy = churn within 48h of signup.

## must_haves

**Truths:**
- Every numerical claim on the landing page (e.g. "X clients", "Y posts/mo", "Z% increase") is either backed by live data OR removed.
- Every capability claim ("AI 24/7", "fully autonomous", "unlimited", "no setup") is either genuinely shipped at the named tier OR replaced with a true equivalent.
- The pricing page does not promise features that aren't activated for the tier the visitor is browsing.
- Trust trio ("3 business days to go live · Pay in Rands · Cancel anytime") survives — confirmed accurate per Phase 10 STATE notes.
- An audit checklist is committed to the phase folder so the next operator can re-verify in 5 minutes when copy changes.

**Artifacts:**
- `.planning/phases/12-launch-polish/12-02-AUDIT.md` exists with a row-by-row checklist of every claim found, its source file/line, the underlying capability check, and disposition (kept / softened / removed / flagged-for-v3.1).
- All landing components updated where audit found drift.
- Pricing page updated where audit found drift.

**Key links:**
- For each claim that says "comes with module X", verify `module_registry` actually carries the gating that the claim implies. If a claim says "Easy view across modules", confirm UX-01 status — only CRM has Easy view currently.
- For each "AI" claim, confirm a BaseAgent subclass exists and is reachable from the named flow.

## Tasks

<task id="1">
  <title>Compile audit checklist of every landing/pricing/signup claim</title>
  <files>.planning/phases/12-launch-polish/12-02-AUDIT.md</files>
  <actions>
    Read every file in `components/landing/` (sections.tsx, hero-section.tsx, industry-solutions.tsx, qualification-cta.tsx, register-interest.tsx, footer.tsx, nav.tsx) and `app/pricing/page.tsx` + `app/signup/page.tsx` + `app/qualify/page.tsx`.

    For each text node containing a numerical claim, capability claim, social proof, or "AI" / "automation" / "unlimited" / "free" word, capture in the audit checklist:

    | Claim | Source (file:line) | Underlying check | Disposition | Action |
    |-------|---------|------------------|-------------|--------|
    | "Run your lodge on autopilot" | hero-section.tsx:23 | Accommodation module + 4 agents shipped — TRUE | Kept | None |
    | "X happy clients" | sections.tsx:267 | (already removed per STATE) | N/A | Confirm absent |
    | ... | ... | ... | ... | ... |

    Disposition values:
    - **Kept** — claim is true and shippable today.
    - **Softened** — claim is partially true; rewrite to match what's actually shipped (e.g. "AI 24/7" → "AI assistance during business hours" if cost ceilings throttle off-hours).
    - **Removed** — claim cannot be made truthfully without v3.1 features; delete it from copy.
    - **Flagged-v3.1** — claim is on roadmap as a real future capability; leave the audit row but list as a v3.1 trigger condition in the checklist.

    Audit must include explicit verification of:
    - Pricing-page module list against `billing_addons_catalog` rows (live).
    - "Easy view" mentions — only CRM has this today (UX-01..UX-07 only mapped to CRM in Phase 11).
    - "Brand voice" — VOICE-01..VOICE-08 shipped — keep all references.
    - "3 business days to go live" — confirmed via ONBOARD-09 — keep.
    - "Pay in Rands" — PayFast ZAR-only — keep.
    - "Cancel anytime" — verify via the billing/subscription cancel route. If the user-facing cancel button doesn't exist, this claim must come down.
    - Module pictograms / counts on landing — count must match `tenant_modules` distinct module_id (currently 7 per CLAUDE.md: crm, email, social, content_studio, accommodation, ai_agents, analytics — plus restaurant + elijah live in code = 9). Reconcile.

    Save the table to `.planning/phases/12-launch-polish/12-02-AUDIT.md`. Header section captures audit date, auditor (Claude), production commit hash, and rerun instructions.
  </actions>
  <verification>
    - File exists with ≥30 audited rows.
    - Every disposition value is one of {Kept, Softened, Removed, Flagged-v3.1}.
    - For every Removed/Softened row, the source file:line is exact (not approximate).
  </verification>
</task>

<task id="2">
  <title>Apply audit dispositions to landing + pricing + signup copy</title>
  <files>
    components/landing/sections.tsx
    components/landing/hero-section.tsx
    components/landing/industry-solutions.tsx
    components/landing/register-interest.tsx
    app/pricing/page.tsx
  </files>
  <actions>
    Walk the audit checklist from task 1. For each row marked Softened or Removed, apply the change in the named source file at the named line.

    Specific rules:
    - Never replace one fabricated number with another fabricated number. If a claim's quantitative form cannot be backed by data, drop the quantitative form entirely (e.g. "trusted by 50+ lodges" → "trusted by lodges across SA" if the count cannot be defended).
    - Capability claims that are "true at platform tier only" must be explicitly tier-scoped in copy (e.g. "Lead scoring (Scale tier)" not "Lead scoring").
    - Each edit gets a code comment referencing the audit row: `{/* audit-12-02: was "X clients" — fabricated, removed */}`.
    - For any "Flagged-v3.1" rows, leave the copy in place ONLY if it's clearly a future-tense aspiration ("Coming Q2 2026"). Otherwise treat as Removed.

    After all changes, run `npm run build` and verify the landing page renders (no broken JSX, no missing keys/imports).
  </actions>
  <verification>
    - All audit rows marked Softened/Removed have corresponding edits in the diff.
    - `npm run build` clean.
    - Manual: visit `/`, `/pricing`, `/signup`, `/qualify` on a Vercel preview. No broken layout. No empty sections (if a whole section was removed, replace with the next section's content shifted up — do not leave hollow CSS containers).
    - Audit file appended with a "Resolved" column showing each row's commit/file change reference.
  </verification>
</task>

## Verification

- Re-run task 1's checklist against the post-edit codebase. Disposition column should now read {Kept, Softened-applied, Removed-applied, Flagged-v3.1}.
- Open the staging URL on a clean browser session, read the landing page top-to-bottom, and write a 1-paragraph note: "Every claim on this page survives a 'show me the feature' demand". Commit that note to the audit file.

## Out of scope

- Visual redesign of the landing page (Wave 3 plan 12-08 covers module-focused redesign).
- Adding new outcome-led copy. Audit is destructive (remove drift) only.
- Changing module pictogram counts in marketing materials outside `components/landing/` and `app/pricing/`.
- Re-shooting hero illustrations (Phase 10 left a Lucide-icon placeholder — unchanged here).

## REQ-IDs closed

None directly. This audit is the "promised-vs-delivered" success criterion in Phase 12 CONTEXT.md, but maps to no specific REQ-ID. Acceptance bar = `12-02-AUDIT.md` exists + every Softened/Removed row applied.
