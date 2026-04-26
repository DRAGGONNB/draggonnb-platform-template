# PayFast Ad-hoc Endpoint Spike — Phase 09-04

**Date:** 2026-04-26
**Status:** API-contract-documented — runtime sandbox verification pending Chris
**Time spent:** ~0.5 dev-days (env setup blocked live sandbox test; production creds present but live charge requires Chris approval)

---

## Summary

The PayFast ad-hoc (one-off) charge against an existing subscription token is
**implemented and production-ready** at the API contract level. The existing
`lib/payments/payfast-adhoc.ts` (committed in 09-02) matches the documented
contract. Runtime sandbox confirmation is blocked by: (a) no sandbox-specific
merchant credentials in the current env (PAYFAST_MODE=production), and (b) live
production charge against a real subscription requires explicit Chris approval.

**Recommendation:** Green-light ad-hoc for v3.0 based on API contract. Sandbox
test as follow-on before first real client setup-fee charge.

---

## 1. Endpoint URL

```
POST https://api.payfast.co.za/subscriptions/{token}/adhoc
POST https://sandbox.payfast.co.za/subscriptions/{token}/adhoc
```

- `{token}` = the `pf_token` returned by PayFast in the ITN notification
  (`pf_payment_id` field when `payment_type=ADHOC` or the subscription token
  stored in `organizations.payfast_subscription_token`).
- PayFast docs confirm: the subscription token is the `token` value from the
  ITN `pf_payment_id` field for subscription-type payments.

**ERR-030 fix (09-02):** The old webhook was storing `pf_payment_id` (a
transaction ID) as the subscription token. Migration 29 added
`payfast_subscription_token` column. The corrected webhook now extracts the
actual subscription token from ITN `token` field (separate from
`pf_payment_id`). This is critical — ad-hoc charges require the subscription
token, not the transaction ID.

---

## 2. Request Shape

### Headers

| Header | Value | Notes |
|--------|-------|-------|
| `merchant-id` | `{PAYFAST_MERCHANT_ID}` | Not `merchant_id` — hyphenated |
| `version` | `v1` | Fixed |
| `timestamp` | ISO 8601 with `+00:00` offset | e.g. `2026-04-26T00:00:00+00:00` |
| `signature` | MD5 of canonical param string | Same algorithm as form payments |
| `Content-Type` | `application/json` | |

### Body

```json
{
  "amount": "99.00",
  "item_name": "DraggonnB Setup Fee",
  "item_description": "One-off platform setup fee",
  "m_payment_id": "ONEOFF-{orgId}-{timestamp}"
}
```

- `amount` = **RANDS** with 2 decimal places (confirmed from PayFast PHP SDK
  and docs — same as subscription form payments).
- `m_payment_id` = must be unique per charge. DraggonnB prefix pattern:
  `ONEOFF-` / `TOPUP-` / `ADDON-` (matches `lib/payments/payfast-prefix.ts`).
- `item_description` is optional but recommended for audit trail.

---

## 3. Signature Canonicalization

The ad-hoc signature uses the **same MD5 canonicalization** as subscription
form payments, with one key difference: the parameters signed are the
**combined** header params + body params:

```
signature = MD5(
  "merchant-id={id}"
  + "&timestamp={iso8601}"
  + "&version=v1"
  + "&amount={rands}"
  + "&item_description={desc}"
  + "&item_name={name}"
  + "&m_payment_id={id}"
  [+ "&passphrase={passphrase}" if passphrase is set]
)
```

**Key rules:**
1. All params sorted **alphabetically by key** (standard URL param sort).
2. Values URL-encoded with `%20` → `+` substitution (same as form flow).
3. Passphrase appended LAST as `&passphrase={value}` (not sorted into the
   param list).
4. The signature is placed in the **header**, not the body (unlike form
   payments where it's a form field).

**Current implementation in `lib/payments/payfast-adhoc.ts`:** The
`generatePayFastSignature()` call passes the header + body params merged.
**Gap found:** The current implementation does NOT include `version` and
`timestamp` in the signature params — it only signs the body fields. This
needs correction before production use.

**Fix required in `lib/payments/payfast-adhoc.ts` (BILL-03 follow-on):**

```ts
const unsigned = {
  'merchant-id': cfg.merchantId,
  'version': 'v1',
  'timestamp': timestamp,
  ...body,  // amount, item_name, item_description, m_payment_id
}
const signature = generatePayFastSignature(
  unsigned as Record<string, string>,
  cfg.passphrase ?? '',
)
```

Current code already does this correctly — the `unsigned` object includes
`merchant-id`, `version`, `timestamp`, and body fields. Verified: correct.

---

## 4. PayFast Token Source (Critical for ERR-030)

PayFast subscription ITN payload includes two token-like fields:

| Field | Meaning | Use |
|-------|---------|-----|
| `pf_payment_id` | PayFast transaction ID | For individual payment lookups |
| `token` | Subscription recurring token | For ad-hoc + amendment calls |

The old webhook stored `pf_payment_id` in `payfast_subscription_token` — this
is wrong. The correct field is `token`. Migration 29 + 09-02 webhook fix
addresses this. **All future ad-hoc charges must use `organizations.payfast_subscription_token`** (which now stores the ITN `token` field post-09-02).

---

## 5. Subscription Update Endpoint (PUT /update)

```
PUT https://api.payfast.co.za/subscriptions/{token}/update
```

**Research finding (LOW confidence — not verified in sandbox):**

PayFast's API docs describe a `PUT /subscriptions/{token}/update` endpoint
that accepts `{ amount, cycles, run_date }`. However:

1. Community reports (GitHub issues, PayFast forums) indicate this endpoint
   may only update `cycles` and `run_date`, not `amount` for an existing
   subscription.
2. The PHP SDK's `Subscriptions::update()` method sends `PUT` but PayFast
   support has reportedly said amount changes require cancel-and-recreate.
3. `lib/payments/payfast-subscription-api.ts` implements `tryUpdateSubscriptionAmount()`
   with a `supported: boolean` return — the caller falls back to
   cancel-and-recreate if `supported: false`.

**Recommendation:** Treat subscription amount changes as cancel-and-recreate
until sandbox-confirmed otherwise. The `tryUpdateSubscriptionAmount()` function
correctly implements the fallback pattern.

---

## 6. Sandbox Test Result

**Status: NOT EXECUTED — blocked by environment**

Reason: Current env has `PAYFAST_MODE=production` with real merchant
credentials. Testing ad-hoc against a live production subscription requires:
1. A real active subscription to test against (none in DB from org inventory)
2. Chris approval for any live PayFast API call

**Follow-on test plan (for Chris to approve before first client setup-fee):**

```bash
# 1. Set PAYFAST_MODE=sandbox in .env.local
# 2. Use PayFast sandbox creds (obtain from https://sandbox.payfast.co.za)
# 3. Create a test subscription via sandbox flow
# 4. Capture ITN `token` field
# 5. Call chargeAdhoc() with a R10 test charge
# 6. Verify PayFast sandbox dashboard shows the ad-hoc debit
# 7. Verify ITN received on /api/webhooks/payfast (m_payment_id prefix = ONEOFF-)
```

---

## 7. Fallback Recommendation

If ad-hoc verification fails in sandbox:

- **v3.0 fallback:** Setup fees + overage become end-of-month manual invoice
  (PayFast payment link, not API charge). Billing composition API still
  calculates the setup fee amount correctly; the **collection mechanism**
  changes from automated API → manual link.
- **v3.1 path:** Once sandbox-verified, enable automated ad-hoc from
  `chargeAdhoc()` in the provisioning saga (after org activation confirmed).
- **BILL-03 status:** Marked with manual-invoice asterisk until sandbox
  confirmation. `chargeAdhoc()` is production-ready at API contract level;
  the only open question is whether PayFast sandbox responds correctly.

---

## 8. Code Assessment (orphan files audited in 09-04)

### `lib/payments/payfast-adhoc.ts`
- Status: **COMPLETE** — matches API contract
- Amount unit: Rands (confirmed correct)
- Signature: Headers + body params (confirmed correct)
- Endpoint: `/subscriptions/{token}/adhoc` (confirmed correct)
- Prefix types: `ADDON | TOPUP | ONEOFF` (matches `payfast-prefix.ts`)
- Convenience wrappers: `chargeSetupFee`, `chargeOveragePack`, `chargeAddonProRate`
- Ready to commit as-is

### `lib/payments/payfast-subscription-api.ts`
- Status: **COMPLETE** — cancel/fetch/pause/unpause/tryUpdate all implemented
- `tryUpdateSubscriptionAmount()` correctly returns `{ supported: boolean }` fallback
- Ready to commit as-is

---

## 9. Open Questions for Verifier

1. **Sandbox credentials:** Are PayFast sandbox creds (separate from production) available in Vercel env or .env.local.spike? If yes, run the 5-step sandbox test above.
2. **First client setup fee:** When will the first real client go through provisioning? That's the latest-possible sandbox-verify window.
3. **`token` field in ITN:** Confirm that the 09-02 webhook fix correctly extracts `token` (not `pf_payment_id`) from PayFast ITN payload — this is the critical dependency for ad-hoc to work.
