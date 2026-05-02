# Phase 13 Plan 01 — PayFast Sandbox Spike (GATE-02)

**Date executed:** 2026-05-02
**Sandbox account:** sandbox.payfast.co.za / merchant_id=1004\*\*\*\* (last 4 redacted)
**Spike script:** `scripts/spikes/payfast-sandbox-spike.mjs`
**Subscription used:** SPIKE-1777722327346 (token `f762905d-...`, ACTIVE)

---

## Three Confirmations

### 1. Amount Unit

**Result:** CENTS — confirmed via Call B (`amount=25000`) returning HTTP 200 success; Call A (`amount=250.00` rands) returning HTTP 400 "Integer Expected".

**Evidence:**

Call A (rands string `250.00`) — HTTP 400:
```json
{"code":400,"status":"failed","data":{"response":{"amount":["Integer Expected"]},"message":false}}
```

Call B (integer cents `25000`) — HTTP 200:
```json
{"code":200,"status":"success","data":{"response":"true","message":"Transaction was successful (00)","pf_payment_id":3136108}}
```

The error message "Integer Expected" is unambiguous: PayFast adhoc API requires an integer value for `amount`. The successful `pf_payment_id` confirms the charge was processed when the integer cents format was used.

**Implication for `chargeAdhoc()`:**
The existing `(args.amountCents / 100).toFixed(2)` conversion at L38 was WRONG. Corrected to `String(args.amountCents)` — send the raw integer cents directly. The interface name `amountCents` is now directly accurate (no conversion needed).

---

### 2. Subscribe-Token Arbitrary-Amount Charge

**Result:** YES — confirmed via Call C with a different amount (7500 cents) against the same token returning HTTP 200 success.

**Evidence:**

Call C (same token, amount=`7500`, different m_payment_id) — HTTP 200:
```json
{"code":200,"status":"success","data":{"response":"true","message":"Transaction was successful (00)","pf_payment_id":3136109}}
```

The token captured during deposit checkout can charge any arbitrary cent amount later. There is no "token is locked to the original subscription amount" restriction on the ad-hoc endpoint.

**Bonus — Idempotency NOT enforced server-side:**
Call D (duplicate m_payment_id of Call C, same amount) — HTTP 200, but with a NEW `pf_payment_id`:
```json
{"code":200,"status":"success","data":{"response":"true","message":"Transaction was successful (00)","pf_payment_id":3136112}}
```
PayFast does NOT deduplicate on `m_payment_id` at the API layer. `pf_payment_id` 3136112 vs 3136109 — a completely new charge was created. **Client code must enforce idempotency.** Use a deterministic `m_payment_id` (e.g., `DAMAGE-{booking_id}-{incident_id}`) and check for existing charges in the DB before calling `chargeAdhoc()`.

**Implication for DAMAGE-11:** Damage charges of arbitrary ZAR amounts can be issued against a Subscribe token captured during accommodation deposit checkout. The `chargeAdhoc()` call in DAMAGE-11 is architecturally sound. The DAMAGE flow must prevent duplicate calls (client-side idempotency key in `damage_incidents` table).

---

### 3. Hold-and-Capture Availability

**Result:** UNAVAILABLE — confirmed by absence of `capture_url`, `hold_reference`, `auth_code`, `authorization_code`, `hold_id`, `capture_token`, or `authorize` fields in all successful response bodies. Successful response structure is exclusively `{code, status, data: {response, message, pf_payment_id}}`.

**Evidence (complete successful response body — all fields annotated):**
```json
{
  "code": 200,           // HTTP-equiv status
  "status": "success",   // string status
  "data": {
    "response": "true",  // charge result
    "message": "Transaction was successful (00)", // processor message
    "pf_payment_id": 3136109  // PayFast's internal transaction ID
  }
}
```

No authorization, hold, or capture fields exist in the response. There is no 2-phase authorize-then-capture capability on the PayFast ad-hoc endpoint.

**Bonus — Zero-amount floor confirmed:**
Call E (`amount=0`) — HTTP 200 with error body (PayFast outer envelope HTTP 200 but inner code 400):
```json
{"code":400,"status":"error","data":{"response":false,"message":"Failure"}}
```

**Implication for DAMAGE-13:** The Phase 15 damage flow CANNOT authorize at incident time and capture later (no hold-and-capture). Architecture must use **immediate charge on approval**. The guest notification + 48-hour dispute window must be implemented BEFORE the charge (not after an authorization hold). The 7-day checkout window (DAMAGE-12) still applies as the hard cutoff.

---

## Reproducible Test Sequence

All calls were made to `https://api.payfast.co.za/subscriptions/{token}/adhoc?testing=true` (NOT `sandbox.payfast.co.za` — see Bug 1 below).

Headers for each call (API signature algorithm):
```
merchant-id: 10044068
version: v1
timestamp: 2026-05-02T{HH}:{MM}:{SS}+00:00
signature: {MD5 of alphabetically-sorted fields + passphrase as merged key}
Content-Type: application/json
```

Body for Call B (successful cents test):
```json
{
  "amount": "25000",
  "item_name": "Spike cents-format test",
  "item_description": "Spike cents-format test",
  "m_payment_id": "SPIKE-AMOUNT-CENTS-B"
}
```

Full response log: `scripts/spikes/payfast-spike-output.json` (gitignored).

Diagnostic scripts used to isolate bugs:
- `scripts/spikes/payfast-signature-probe.mjs` — ruled out 6 encoding variants
- `scripts/spikes/payfast-merchant-probe.mjs` — confirmed merchant credentials
- `scripts/spikes/payfast-raw-probe.mjs` — captured raw error responses
- `scripts/spikes/payfast-order-probe.mjs` — proved insertion-order is correct for form signatures

---

## Code Corrections Applied

Five bugs were found during this spike. All corrections applied in commit tagged `feat(13-01): payfast-adhoc corrections + api-signature helper + form-signature bug fixes`.

---

### Bug 1 — Wrong sandbox API base URL (`lib/payments/payfast-adhoc.ts:11-13`)

**Found during:** Step 2 (all calls returning HTTP 405 Method Not Allowed)
**Root cause:** `PAYFAST_API_BASE_SANDBOX = 'https://sandbox.payfast.co.za'` — this subdomain serves the payment page UI, not the REST API. The API is always at `api.payfast.co.za`; sandbox mode is activated via `?testing=true` query param.

**Fix:**
```diff
- const PAYFAST_API_BASE_PROD = 'https://api.payfast.co.za'
- const PAYFAST_API_BASE_SANDBOX = 'https://sandbox.payfast.co.za'
+ const PAYFAST_API_BASE = 'https://api.payfast.co.za'
  // ...
- const base = cfg.mode === 'production' ? PAYFAST_API_BASE_PROD : PAYFAST_API_BASE_SANDBOX
- const url = `${base}/subscriptions/${args.subscriptionToken}/adhoc`
+ const testingParam = cfg.mode === 'sandbox' ? '?testing=true' : ''
+ const url = `${PAYFAST_API_BASE}/subscriptions/${args.subscriptionToken}/adhoc${testingParam}`
```

**Files modified:** `lib/payments/payfast-adhoc.ts` (lines 11-13, 58)

---

### Bug 2 — Sends rands instead of cents (`lib/payments/payfast-adhoc.ts:38`)

**Found during:** Step 2 (Call A failure with "Integer Expected")
**Root cause:** `(args.amountCents / 100).toFixed(2)` converts to rands with decimal. PayFast adhoc API requires integer cents.

**Fix:**
```diff
- // Send rands with 2 decimal places (spike pending in 09-04 to confirm unit)
- const amountRands = (args.amountCents / 100).toFixed(2)
+ // Amount unit: INTEGER CENTS — confirmed via Phase 13 Plan 01 sandbox spike (2026-05-02).
+ const amountStr = String(args.amountCents)
```

**Files modified:** `lib/payments/payfast-adhoc.ts` (line 38)

---

### Bug 3 — Form signature uses alphabetical sort instead of insertion order (`lib/payments/payfast.ts:244`)

**Found during:** Signature probe (`scripts/spikes/payfast-order-probe.mjs`) — HTTP 302 ACCEPTED only with insertion-order variant; alphabetical sort returned 400 "Generated signature does not match submitted signature".
**Root cause:** `Object.keys(data).sort()` — PayFast's official PHP SDK iterates `$_POST` in insertion order (not alphabetical order).

**Fix:**
```diff
  const paramString = Object.keys(data)
-   .sort()
    .filter(key => key !== 'signature')
    .map(key => `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}`)
    .join('&')
```

**Files modified:** `lib/payments/payfast.ts` (line 244)

---

### Bug 4 — Passphrase space encoding uses `%20` instead of `+` in form signature (`lib/payments/payfast.ts:251`)

**Found during:** Signature probe with multi-word passphrase "DraggonnB Business Automation".
**Root cause:** `encodeURIComponent(passphrase.trim())` leaves `%20` for spaces. PHP `urlencode()` (PayFast's algorithm) consistently uses `+` for spaces.
**Note:** This bug was silent in production because the live passphrase had no spaces. The sandbox passphrase "DraggonnB Business Automation" has two spaces and exposed the mismatch.

**Fix:**
```diff
  const stringToHash = passphrase
-   ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`
+   ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : paramString
```

**Files modified:** `lib/payments/payfast.ts` (line 251)

---

### Bug 5 — API signature algorithm missing (`lib/payments/payfast.ts`)

**Found during:** Step 2 (HTTP 400 when using form-signature algorithm for API calls).
**Root cause:** The existing `generatePayFastSignature` is shaped for form submissions (insertion order, passphrase appended last). PayFast API header calls use a different algorithm: alphabetical ksort, passphrase merged as a regular sortable field. These are two distinct functions in PayFast's PHP SDK (`generateSignature` vs `generateApiSignature`).

**Fix:** Added new exported function `generatePayFastApiSignature(data, passphrase)` to `lib/payments/payfast.ts`. Updated `chargeAdhoc()` to import and use it instead of `generatePayFastSignature`.

```typescript
export function generatePayFastApiSignature(
  data: Record<string, string>,
  passphrase?: string
): string {
  const merged: Record<string, string> = { ...data }
  if (passphrase) { merged.passphrase = passphrase }
  const paramString = Object.keys(merged)
    .sort()
    .filter(key => key !== 'signature')
    .map(key => `${key}=${encodeURIComponent(merged[key].trim()).replace(/%20/g, '+')}`)
    .join('&')
  return crypto.createHash('md5').update(paramString).digest('hex')
}
```

**Files modified:** `lib/payments/payfast.ts` (new function added), `lib/payments/payfast-adhoc.ts` (import updated)

---

## Unit Test Coverage

`__tests__/unit/payments/payfast-adhoc.test.ts` (15 tests, all pass):

- `chargeAdhoc()` sends `amountCents` as integer string — verifies `amount=25000` not `250.00`
- `chargeAdhoc()` sends 1 cent as `"1"` not `"0.01"`
- `chargeAdhoc()` sends 149900 as `"149900"` not `"1499.00"`
- Uses `api.payfast.co.za` not `sandbox.payfast.co.za`
- Appends `?testing=true` in sandbox mode
- Returns `success:true` and `mPaymentId` on HTTP 200
- `generatePayFastApiSignature()` is 32-char MD5, includes passphrase in hash
- `generatePayFastApiSignature()` produces DIFFERENT result from `generatePayFastSignature()` (algorithm divergence guard)
- `generatePayFastApiSignature()` is deterministic
- `generatePayFastApiSignature()` encodes spaces as `+` not `%20`
- `generatePayFastSignature()` uses insertion order NOT alphabetical sort
- `generatePayFastSignature()` encodes passphrase spaces as `+` not `%20`
- `generatePayFastSignature()` excludes `signature` key from hash
- `generatePayFastSignature()` without passphrase omits suffix

---

## Sign-Off

GATE-02 RESOLVED — Phase 15 damage code (DAMAGE-11..17) green-lit to proceed with the following confirmed architecture:

| Fact | Confirmed Value | Action Required |
|------|-----------------|-----------------|
| Amount unit | INTEGER CENTS | `chargeAdhoc()` corrected |
| Arbitrary amounts | YES | No change needed in Phase 15 |
| Hold-and-capture | UNAVAILABLE | Phase 15 must charge immediately on approval |
| Idempotency | NOT server-enforced | Phase 15 must enforce via DB (`damage_incidents` unique key) |
| Zero floor | REJECTED (inner 400) | Validation in Phase 15 chargeAdhoc() wrapper |

Spike scripts retained in `scripts/spikes/` for future re-validation. Output JSON at `scripts/spikes/payfast-spike-output.json` (gitignored). Raw response HTML at `scripts/spikes/payfast-raw-response.html` (gitignored).
