---
phase: 13-cross-product-foundation
plan: 01
subsystem: payments
tags: [payfast, adhoc-billing, sandbox-spike, md5-signature, cents, api-auth]

# Dependency graph
requires:
  - phase: 09-foundations-guard-rails
    provides: "chargeAdhoc() function skeleton in lib/payments/payfast-adhoc.ts with spike-pending comment"
provides:
  - "PayFast adhoc API: amount unit confirmed as INTEGER CENTS (not rands)"
  - "generatePayFastApiSignature() helper for API-header authenticated calls"
  - "Form signature corrected: insertion order, passphrase spaces as '+'"
  - "Spike report at 13-PAYFAST-SANDBOX-SPIKE.md — all 3 confirmations populated"
  - "GATE-02 + DAMAGE-05 resolved"
  - "15 unit tests for adhoc amount unit, API signature, form signature"
affects:
  - phase-15 (damage billing — chargeAdhoc() call now correct; arbitrary amount confirmed; hold-and-capture confirmed unavailable)
  - phase-16-trophy-payfast (TROPHY-01 copy-paste target — payfast-adhoc.ts now has correct algorithm)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PayFast adhoc API requires integer cents, not rands with decimals"
    - "PayFast form signature = insertion order + passphrase as trailing suffix with + space encoding"
    - "PayFast API signature = alphabetical ksort + passphrase merged as regular sorted field"
    - "PayFast API base URL = api.payfast.co.za for both modes; sandbox via ?testing=true param"
    - "Client must enforce idempotency (PayFast does NOT dedupe on m_payment_id)"

key-files:
  created:
    - lib/payments/payfast.ts (generatePayFastApiSignature function added)
    - __tests__/unit/payments/payfast-adhoc.test.ts
    - .planning/phases/13-cross-product-foundation/13-PAYFAST-SANDBOX-SPIKE.md
    - scripts/spikes/payfast-sandbox-spike.mjs (working state post-fix)
    - scripts/spikes/payfast-signature-probe.mjs
    - scripts/spikes/payfast-merchant-probe.mjs
    - scripts/spikes/payfast-raw-probe.mjs
    - scripts/spikes/payfast-order-probe.mjs
  modified:
    - lib/payments/payfast-adhoc.ts (URL base, amount unit, signature function)
    - lib/payments/payfast.ts (form signature sort order, passphrase encoding)
    - .planning/REQUIREMENTS.md (GATE-02 + DAMAGE-05 → [x])
    - .gitignore (payfast-raw-response.html added)

key-decisions:
  - "Amount unit = INTEGER CENTS. Call A (250.00 rands) → HTTP 400 Integer Expected. Call B (25000 cents) → HTTP 200 success."
  - "Hold-and-capture UNAVAILABLE on PayFast adhoc API. Phase 15 must use immediate-charge-on-approval architecture."
  - "Idempotency NOT enforced server-side by PayFast. Duplicate m_payment_id creates a new charge. Phase 15 must check DB before calling chargeAdhoc()."
  - "API signature and form signature are different algorithms. Using the wrong one causes HTTP 400."
  - "PayFast spike script (sandbox-spike.mjs) stays in repo for re-validation; diagnostic helpers stay for audit trail."

patterns-established:
  - "generatePayFastApiSignature for API calls (ksort + passphrase merged)"
  - "generatePayFastSignature for form submissions only (insertion order + passphrase trailing)"

# Metrics
duration: ~3h (Task 1 ran prior session; Task 2 executed 2026-05-02)
completed: 2026-05-02
---

# Phase 13 Plan 01: PayFast Sandbox Spike (GATE-02) Summary

**PayFast adhoc API confirmed: integer cents required, arbitrary-amount Subscribe-token charges work, hold-and-capture unavailable — 5 code bugs fixed across payfast-adhoc.ts and payfast.ts, 15 new tests**

## Performance

- **Duration:** ~3 hours total (Task 1 in prior session; Task 2 in this session ~45 min)
- **Started:** 2026-05-02 (Task 1), continuation same day (Task 2)
- **Completed:** 2026-05-02T14:15Z
- **Tasks:** 2 (Task 1 + checkpoint resolved + Task 2)
- **Files modified:** 8 (code + tests + docs + gitignore + requirements)

## Accomplishments

- Live sandbox spike executed: 5 ad-hoc charge API calls against real PayFast sandbox token `f762905d-...`, all response bodies captured
- Three confirmations written in `13-PAYFAST-SANDBOX-SPIKE.md`: amount=CENTS, arbitrary-amounts=YES, hold-and-capture=NO
- Five production bugs found and corrected: URL base, amount conversion, form-sig sort order, passphrase space encoding, missing API-sig helper
- 15 unit tests added covering all corrected behaviors; all pass; tsc clean

## Task Commits

1. **Task 1: Spike script** — `9829c0fd` (feat — bundled into 13-03 commit due to parallel-agent race; see Deviations)
2. **Task 2: Corrections + report + tests** — `b54e5677` (feat)

**Plan metadata:** committed in `docs(13-01)` commit (below)

## Files Created/Modified

- `lib/payments/payfast-adhoc.ts` — URL base unified, amount unit fixed to integer cents, API signature helper used
- `lib/payments/payfast.ts` — form signature sort order fixed (insertion order), passphrase space encoding fixed (%20→+), `generatePayFastApiSignature()` added
- `__tests__/unit/payments/payfast-adhoc.test.ts` — 15 tests: amount unit, URL base, ?testing=true, API sig ksort, form sig insertion-order and space encoding
- `.planning/phases/13-cross-product-foundation/13-PAYFAST-SANDBOX-SPIKE.md` — full spike report with 3 confirmations, response excerpts, 5 bug write-ups, sign-off table
- `.planning/REQUIREMENTS.md` — GATE-02 and DAMAGE-05 marked [x] RESOLVED
- `.gitignore` — `scripts/spikes/payfast-raw-response.html` added
- `scripts/spikes/payfast-sandbox-spike.mjs` — updated to working post-fix state
- `scripts/spikes/payfast-{signature,merchant,raw,order}-probe.mjs` — diagnostic helpers retained for audit trail

## Decisions Made

- **Amount unit = INTEGER CENTS**: Confirmed by HTTP 400 "Integer Expected" on rands-format call, HTTP 200 success on cents-format call. `chargeAdhoc()` corrected.
- **Hold-and-capture UNAVAILABLE**: PayFast adhoc response body is `{code, status, data: {response, message, pf_payment_id}}` only. No authorization/capture fields exist. Phase 15 damage architecture must be immediate-charge-on-approval (no hold window).
- **Client idempotency required**: Duplicate m_payment_id returned a new `pf_payment_id`. PayFast does not deduplicate. Phase 15 must check `damage_incidents` table before calling `chargeAdhoc()`.
- **Two distinct signature algorithms**: Form signature (insertion order, passphrase trailing) and API signature (ksort, passphrase merged) are separate algorithms in PayFast SDK. Created separate exported functions to prevent algorithm confusion.
- **Spike diagnostic scripts kept**: Four diagnostic probe scripts (`signature-probe`, `merchant-probe`, `raw-probe`, `order-probe`) committed to `scripts/spikes/` for audit trail and future re-validation when PayFast API changes.

## Deviations from Plan

### Parallel-Agent Race — Task 1 Spike Script Bundled into 13-03 Commit

- **Found during:** Post-execution review
- **Issue:** Task 1 spike script (`payfast-sandbox-spike.mjs`) was committed in `9829c0fd feat(13-03): create module manifest contract` rather than as a standalone 13-01 task commit. This happened because 13-01 and 13-03 were both executing in parallel agents and 13-03's agent committed the spike script as part of its own sweep of untracked files.
- **Impact:** Functionally zero — the script is in the correct location and was committed. The commit hash `9829c0fd` correctly represents the work. Only the commit message attribution is imprecise.
- **Resolution:** Documented here and in the spike report. Git history NOT rewritten (per task brief: "do NOT rewrite history"). Future multi-wave parallel executions should stage only explicitly task-related files.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong PayFast API base URL in payfast-adhoc.ts**

- **Found during:** Task 2 (spike execution — all API calls returning HTTP 405)
- **Issue:** `PAYFAST_API_BASE_SANDBOX = 'https://sandbox.payfast.co.za'` — the `sandbox.payfast.co.za` subdomain serves the payment UI, not the REST API. API calls must go to `api.payfast.co.za` with `?testing=true` for sandbox mode.
- **Fix:** Unified to single `PAYFAST_API_BASE = 'https://api.payfast.co.za'`; appended `?testing=true` conditionally.
- **Files modified:** `lib/payments/payfast-adhoc.ts`
- **Commit:** `b54e5677`

**2. [Rule 1 - Bug] Fixed amount unit in payfast-adhoc.ts — sends rands not cents**

- **Found during:** Task 2 (Call A HTTP 400 "Integer Expected")
- **Issue:** `(args.amountCents / 100).toFixed(2)` divided to rands and added decimal. PayFast adhoc API requires integer.
- **Fix:** `String(args.amountCents)` — send raw integer cents.
- **Files modified:** `lib/payments/payfast-adhoc.ts`
- **Commit:** `b54e5677`

**3. [Rule 1 - Bug] Fixed form signature sort order in payfast.ts**

- **Found during:** Signature probe diagnostic (`payfast-order-probe.mjs`)
- **Issue:** `Object.keys(data).sort()` — PayFast's PHP SDK iterates `$_POST` in insertion order. Alphabetical sort returns 400 "signature mismatch" for every real checkout attempt.
- **Fix:** Removed `.sort()` from `generatePayFastSignature`.
- **Files modified:** `lib/payments/payfast.ts`
- **Commit:** `b54e5677`

**4. [Rule 1 - Bug] Fixed passphrase space encoding in form signature**

- **Found during:** Signature probe with "DraggonnB Business Automation" passphrase (contains spaces)
- **Issue:** `encodeURIComponent(passphrase.trim())` leaves `%20` for spaces. PayFast PHP `urlencode()` uses `+`. Mismatch caused signature failures with any passphrase containing spaces.
- **Fix:** Added `.replace(/%20/g, '+')` after passphrase encoding.
- **Files modified:** `lib/payments/payfast.ts`
- **Commit:** `b54e5677`

**5. [Rule 2 - Missing Critical] Added generatePayFastApiSignature() helper**

- **Found during:** Task 2 (HTTP 400 when using form-signature algorithm for API calls)
- **Issue:** No separate API signature function existed. PayFast adhoc API calls use a different algorithm from form submissions (ksort vs insertion order; passphrase as merged field vs trailing suffix). Using the form function for API calls causes signature rejection.
- **Fix:** Added `generatePayFastApiSignature(data, passphrase)` to `payfast.ts`; updated `payfast-adhoc.ts` to import and use it.
- **Files modified:** `lib/payments/payfast.ts`, `lib/payments/payfast-adhoc.ts`
- **Commit:** `b54e5677`

---

**Total deviations:** 1 parallel-agent race (documented, not auto-fixed) + 5 auto-fixed bugs (4 Rule 1, 1 Rule 2)
**Impact on plan:** All 5 bug fixes were required for correct PayFast integration. No scope creep. The parallel-agent race is a process note only; code output is correct.

## Issues Encountered

- **HTTP 405 from sandbox.payfast.co.za** — All initial API calls failed with Method Not Allowed. Root cause: wrong domain (Bug 1). Required iterative diagnostic scripts to isolate.
- **HTTP 400 "Generated signature does not match"** — Signature failures from both wrong sort order (Bug 3) and passphrase space encoding (Bug 4). `payfast-order-probe.mjs` and `payfast-signature-probe.mjs` were written to isolate the exact failure mode by testing 6 encoding variants in sequence.
- **vitest on Windows** — Spurious `STATUS_STACK_BUFFER_OVERRUN` exits in some test runs (pre-existing environment instability documented in 13-03 context). Tests pass on clean runs; 15/15 confirmed.

## User Setup Required

None for this plan. Sandbox credentials were supplied by user at checkpoint between Task 1 and Task 2.

## Next Phase Readiness

- GATE-02 resolved: Phase 15 damage billing (DAMAGE-01..17) is unblocked.
- Phase 15 architecture constraint documented: immediate-charge-on-approval required (hold-and-capture unavailable). Phase 15 planner must not design a hold window.
- Phase 15 idempotency constraint: `damage_incidents` table must have a unique constraint on `(booking_id, m_payment_id)` or equivalent; chargeAdhoc() caller must check before invoking.
- TROPHY-01 (payfast file copy to Trophy OS): `payfast-adhoc.ts` and `payfast.ts` are now correct. Copy happens in Phase 16.

---
*Phase: 13-cross-product-foundation*
*Completed: 2026-05-02*
