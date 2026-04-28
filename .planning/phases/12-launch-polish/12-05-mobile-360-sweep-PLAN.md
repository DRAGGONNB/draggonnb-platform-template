---
phase: 12
plan_id: 12-05
title: Mobile 360px sweep across revenue-critical pages
wave: 2
depends_on: [12-02]
files_modified:
  - components/landing/sections.tsx
  - components/landing/hero-section.tsx
  - components/landing/industry-solutions.tsx
  - app/pricing/page.tsx
  - app/signup/page.tsx
  - app/payment/page.tsx
  - app/(dashboard)/dashboard/page.tsx
  - app/(dashboard)/crm/page.tsx
  - .planning/phases/12-launch-polish/12-05-MOBILE-AUDIT.md
autonomous: true
estimated_loc: 250
estimated_dev_minutes: 120
---

## Objective

Walk every revenue-critical page at 360px viewport (the SA-baseline Android width — Samsung Galaxy A-series). Fix any layout overlap, off-canvas content, or button-truncation that would cost a prospect a tap. Phase 10 verified SITE-04 at code level; Lighthouse measurement was deferred to launch-day. This plan does the visual + interaction sweep.

Pages in scope:
- `/` (landing)
- `/pricing`
- `/signup`
- `/payment` (PayFast handoff page)
- `/dashboard` (post-login home)
- `/dashboard/crm` (Easy view)

Each page must render readably, no horizontal scroll, all CTAs tappable (≥44px target), forms usable, no overlapping text. Output a per-page audit doc with screenshots / observations + the fix applied.

## must_haves

**Truths:**
- At 360px viewport, no page in scope produces horizontal scroll.
- At 360px, all CTA buttons are ≥44px tall and not horizontally truncated.
- All form inputs (signup, payment) are 100% width with comfortable padding.
- All pricing module-picker controls are tappable without zoom.
- Sidebar (in dashboard) collapses to an icon-only or hamburger pattern on <768px (verify; if not implemented, defer to Wave 3 sidebar redesign and document the gap).
- Audit doc captures per-page before/after observations.

**Artifacts:**
- `.planning/phases/12-launch-polish/12-05-MOBILE-AUDIT.md` — per-page checklist with status, fix-applied, residual issues.
- All Tailwind class adjustments in the named source files.

**Key links:**
- Phase 10 SITE-04 used the same 360px target — most of the public site was built with that breakpoint in mind. Fixes here are likely small (overflow-x-hidden, gap reduction, single-column override at sm:).
- Dashboard sidebar mobile collapse is NOT in scope for this plan if the existing Sidebar.tsx doesn't support it — note the gap and the Wave 3 redesign will close it.

## Tasks

<task id="1">
  <title>Run 360px audit on all 6 pages + capture per-page issues</title>
  <files>.planning/phases/12-launch-polish/12-05-MOBILE-AUDIT.md</files>
  <actions>
    Use Playwright (already installed per `.playwright-mcp/` artifact) or equivalent headless browser to render each page at viewport `360x780` (typical Android portrait). For each page, capture:

    1. Full-page screenshot at 360px.
    2. List of issues observed: horizontal scroll? truncated buttons? overlapping text? form field overflow? CTA not tappable? Sidebar covering content?
    3. Severity per issue: blocker (prevents conversion), major (degrades UX), minor (cosmetic).

    Pages to audit:
    - `https://draggonnb.online/` (production landing — use Vercel preview URL if main is locked).
    - `/pricing`
    - `/signup`
    - `/payment` — load with a dummy m_payment_id to render the "redirecting to PayFast" state.
    - `/dashboard` (logged in as `tester-pro@draggonnb.test`)
    - `/dashboard/crm`

    Save findings to `.planning/phases/12-launch-polish/12-05-MOBILE-AUDIT.md` in this format:

    ```
    ## /pricing — 360px audit (2026-04-XX)
    Screenshot: docs/audit-screenshots/pricing-360.png

    ### Issues found
    - [BLOCKER] Module picker addon row overflows right side by ~12px (charcoal-100 background visible).
    - [MAJOR] "Subscribe" button text truncates to "Subscri..." on the inline summary card.
    - [MINOR] FAQ accordion arrows misaligned by 1px.

    ### Fixes applied
    - sections.tsx:412 — change `flex-row` to `flex-col sm:flex-row` on addon row.
    - PricingPreview button — add `whitespace-nowrap text-sm`.
    - FAQ — defer (cosmetic, not revenue-blocking).
    ```

    For pages where the dashboard sidebar overlaps content at 360px (likely true given current Sidebar.tsx uses `fixed left-0 w-64`), document the issue but DO NOT fix here — note as "Deferred to 12-06 (sidebar redesign)".
  </actions>
  <verification>
    - Audit doc exists with sections for all 6 pages.
    - Each page section has a screenshot reference + ≥1 observation (or explicit "no issues").
    - Each issue has a severity tag.
    - Sidebar-related issues on `/dashboard*` are flagged as "Deferred to 12-06" rather than fixed.
  </verification>
</task>

<task id="2">
  <title>Apply non-sidebar fixes from audit</title>
  <files>
    components/landing/sections.tsx
    components/landing/hero-section.tsx
    components/landing/industry-solutions.tsx
    app/pricing/page.tsx
    app/signup/page.tsx
    app/payment/page.tsx
    app/(dashboard)/dashboard/page.tsx
    app/(dashboard)/crm/page.tsx
  </files>
  <actions>
    Walk every BLOCKER and MAJOR issue from the audit (excluding sidebar-related). Apply the smallest CSS/Tailwind change that resolves each. Common patterns:

    - Horizontal scroll → add `overflow-x-hidden` to top-level container OR convert flex-row to flex-col-then-row at sm: breakpoint.
    - Truncated button → `whitespace-nowrap` + drop one icon or shorten label OR set `text-sm` at base, `text-base sm:text-base`.
    - Form field overflow → `w-full` + remove fixed `max-w-` overrides at base size.
    - Padding too tight → swap `p-2` → `p-3` (Tailwind 4u → 12px).
    - Tap target too small → `min-h-[44px]` on inline buttons.

    For each fix, add a brief inline comment: `{/* mobile-12-05: was X, fixed for 360px */}`.

    After each fix, re-screenshot the page at 360px and append to the audit doc as "after-fix" image.

    MINOR issues — leave or fix at your discretion within the time budget. Cosmetic-only minors should NOT block this plan; document as "Deferred — minor" in the audit.
  </actions>
  <verification>
    - Re-render each page at 360px in Playwright. Zero horizontal scroll on any page.
    - Every BLOCKER from task 1's audit has a Resolved checkmark.
    - Every MAJOR has a Resolved checkmark OR a documented reason for deferral.
    - `npm run build` clean.
    - Sidebar-related issues remain Deferred to 12-06.
  </verification>
</task>

## Verification

- Audit doc reads top-to-bottom as a 6-page checklist with before/after observations.
- Manual: hit each page on a real Android device (or BrowserStack equivalent) at 360px portrait. Smoke-test the conversion path: landing → pricing → signup → payment.
- `npm run build` clean.

## Out of scope

- Sidebar mobile collapse — Wave 3 plan 12-06 builds a redesigned sidebar that handles mobile from the start.
- Lighthouse score measurement — a launch-day activity per Chris's directive (Phase 10 STATE notes).
- Fixing pages outside the 6-page revenue path. Module deep pages (e.g. `/accommodation/calendar`) are out of scope here; the redesign in Wave 3 covers those.
- Re-shooting hero illustrations or new graphics. Tailwind/layout fixes only.

## REQ-IDs closed

None directly — SITE-04 already closed at the code level in Phase 10. This plan satisfies Phase 12 ROADMAP success criterion #4 ("every revenue-critical page renders cleanly at 360px on a real SA-representative device").
