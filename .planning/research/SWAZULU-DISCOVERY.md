# Swazulu Discovery Brief — GATE-01

**Status:** EFFECTIVELY COMPLETE (resolved 2026-05-01 via DB audit + Chris owner-knowledge session)
**Pilot:** First v3.1 dual-product (DraggonnB OS + Trophy OS) tenant
**Org context:** Chris Terblanche set up Swazulu's lodges personally — owner-side knowledge already captured; Swazulu pricing/policy artefacts collected separately (out-of-band)

---

## 1. What's already in the database

Org row (`organizations`):
- `id`: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `name`: Swa-Zulu Game Lodge
- `slug`: `swa-zulu` · `subdomain`: NULL · `subscription_tier`: `professional` · `subscription_status`: `active`
- `is_active`: true · `archived_at`: NULL · `created_at`: 2026-03-28
- `payfast_subscription_token`: NULL — **PAYFAST NOT YET WIRED**

Modules enabled (`tenant_modules`):
| Module | Enabled | Config |
|---|---|---|
| accommodation | 2026-03-28 | `{}` |
| ai_agents | 2026-03-28 | `{}` |
| analytics | 2026-03-28 | `{}` |
| crm | 2026-03-28 | CRM stale thresholds (lead 7d / qualified 14d / proposal 10d / negotiation 21d) |
| events | 2026-03-28 | `{}` |
| security_ops | 2026-04-01 | `{}` |

Trophy/Restaurant modules not activated. No `damage_price_list` config yet.

Org users (`organization_users`): 3 seeded test users
- `aaaaaaaa-1111-...` role=`client`
- `aaaaaaaa-2222-...` role=`user`
- `aaaaaaaa-3333-...` role=`manager`

Properties (`accommodation_properties`):
| Name | Status | Units | Notes |
|---|---|---|---|
| The Farmstead Collection | active | 4 | Farmstead Suite, Bush Rondavel, Garden Cottage, Family Unit |
| Maroela Lodge | **inactive** | 4 | All units in `maintenance` status |
| The Bush Villa | active | 4 | Master Suite + 2 bush rooms + loft; `exclusive_use_only=true` policy |

Address: Ged 1 Van die Plaas JQ217 Klein Wildebeesfontein Beestekraal, Brits, North West, ZA
Contact: info@swazulu.com / +27 82 899 9900
Default policy on properties: 14-day cancellation window, 50% deposit, no pets, children welcome.

Units (12 total — see DB for full detail):
- Maroela: Maroela Suite (R2,500), Bushveld Room (R1,800), Honeymoon Villa (R4,500), Family Suite (R3,500) — all in maintenance
- Bush Villa: Master Suite (R2,200), Bush Rooms 1+2 (R1,600 each), Loft Room (R2,000)
- Farmstead: Main Farmhouse Suite (R1,800), Bush Rondavel (R1,200), Garden Cottage (R2,200), Family Unit (R2,800)

Rate plans (16 total): Green/Shoulder/High/Peak season multipliers (0.85 / 1.00 / 1.20 / 1.35) + per-property "Exclusive Use Standard", "Exclusive Use with Chef", "Standard Self-Catering", "Peak Season B&B".

**Cancellation policies (`accommodation_cancellation_policies`):** ZERO ROWS — referenced from rate plans but never seeded. Chris's verbal policy ("100% refund 1 month out, 50% 2 weeks out, last-minute = lose deposit, full payment before start") is NOT in DB.

**Deposit policies (`accommodation_deposit_policies`):** ZERO ROWS.

Add-ons (`accommodation_addons`):
- Activities: Morning Game Drive R750/pp, Sunset Game Drive R850/pp
- Dining: Biltong & Wine Welcome R350/booking, Private Braai Pack R450/booking, Private Chef R1,800/booking
- Transport: Airport Transfer (OR Tambo) R2,500/booking

**No damage price list seeded.**
**No stock items seeded.**
**No service catalog rows.**

Bookings: 2 (both test data)
- SZ-2026-0001: confirmed, R15,000, R7,500 paid, 31 Mar–3 Apr
- SZ-2026-2963FD06: pending_deposit, R7,200 unpaid, 16–20 Apr

Guests: 2 (Test Guest + CJ Terblanche himself).

Trophy/safari data: ZERO ROWS for this org_id (`safaris`, `safari_clients`). Trophy OS not yet provisioned for Swazulu.

---

## 2. Confirmed operational reality (from owner session)

### Entity model
**Single legal entity** — Swazulu is the farmer + game breeder + hunting service + events service under one roof. Owner = Chris's contact. Farm/lodge manager has assignment authority. Budget controller approves procurement (shopping lists, maintenance service payments).

### Current billing/payment posture
- **EFT via bank transfer**, after **annual invoicing** kicks off the relationship.
- Hunting services + hunted species are **manually invoiced after the hunt** on top of the booking reference.
- **No PayFast account yet.** Two paths: (a) Swazulu opens its own PayFast, (b) DraggonnB-managed PayFast with per-transaction fee → **investor partnership angle**.
- Other farms may go either way — must accommodate **both routing modes per tenant**.

### Damage workflow (SOP-driven)
Post-checkout: staff run damage SOP. Sequence:
1. SOP1 — pre-departure walkthrough
2. SOP2 — post-departure check (after lodge readiness reset for next booking)
3. Breakage → report → manager → quote
4. Manager approves → auto-charge to bill OR deduct from security deposit (varies by farm)

Charge timing: AFTER SOP completed and breakage flagged. Need **per-tenant override** of charge-vs-deposit-deduct mode and price list.

Damage price examples Chris mentioned: glass R20, plate R25 — full list pending. Must support upload during onboarding (service-take-on flow).

**Lodge readiness for next booking is already automated** via AI ops agent. Damage check fits inside that handoff window.

### Hunt/hunter financial model
- **Booking owner is the financial focal point.**
- One person (booker) typically pays for the **PH + game vehicle** (infrastructure, fixed cost).
- **Animals + slaughter** are charged **per hunter** but **added to the booking owner's bill** (lodge-side aggregation across all lodges) — booker recoups from individual hunters out-of-band OR via per-payer payment links.
- Group bookings happen across multiple lodges; one booker, multiple hunters.
- Slaughter (butchery) and taxidermy are **external vendors** — Swazulu is NOT the butcher.
- Carcass handover is defined by hunted-animal owner with explicit slaughter instructions (quarters, halves, etc.).

### Cancellation policy (Swazulu — to capture as JSON)
- 100% refund: 1+ month before booking start
- 50% refund: 2 weeks before booking start
- Last-minute: deposit lost
- Full payment required before start date for accommodation

**Differs per lodge for other farms.** Must be tenant-configurable.

### Booking type unification
**Keep separate, link via FK.** Confirmed: hunt-stay = "Hunting Safari" booking type in Trophy OS, lodge-only = events/accommodation booking. Each ringfenced; FK linkage at the data layer; **financial unification at the invoice layer**.

### Role overlap reality
For Swazulu specifically: owner + manager track hunts AND run the lodge. Same human, different hats. Confirms D2 (per-product memberships, no auto-translate) — the SAME user has rows in both `organization_users` (DraggonnB) AND `org_members` (Trophy) but the role assignments are not auto-derived.

### Dashboard expectation
**Smart dashboards per role + per subscribed module.** NOT a single all-products dashboard. Owner sees aggregated KPIs; PH sees safari-focused; housekeeper sees ops board. Extends Phase 11 `<ModuleHome>` Easy/Advanced pattern with role-aware presets.

---

## 3. Locked architecture decisions (recommendations adopted)

### A. Polymorphic billing layer (NEW — drives INVOICE-* category)
Operational records stay separate per product (`accommodation_bookings`, `safaris`, `safari_hunters`, future `breeder_*`). Financial truth is **platform-level** in three new tables:

```
billing_invoices            — one per "engagement" (booker's bill)
billing_invoice_lines       — polymorphic source (source_type + source_id), hunter_id NULLABLE
billing_invoice_payment_links — multi-payer settlements against same invoice
```

Each module emits **lines** into the umbrella invoice via a federation-shared billing service. Trophy OS does NOT gain a billing table — it calls `addInvoiceLine()` for safaris, animals, slaughter. Booker gets ONE invoice; per-hunter extras tagged via `hunter_id`; payment links slice the invoice (booker pays infrastructure lines, hunters pay their own kills, transactional fee applied per link when on DraggonnB-managed PayFast).

### B. Per-tenant payment routing (NEW — drives PAYROUTE-* category)
`tenant_modules.config.billing` shape:
```json
{
  "payment_route": "own_payfast" | "draggonnb_payfast" | "eft_manual",
  "own_payfast": { "merchant_id": "...", "merchant_key": "..." },
  "draggonnb_payfast": { "fee_pct": 2.5, "fee_fixed_zar_cents": 1000 }
}
```
Per-payment-link fee calculation when route is `draggonnb_payfast`. EFT mode skips PayFast entirely — invoice issued, manual reconciliation. Damage flow: token-check first, manual collection fallback when EFT.

### C. Module manifest standardisation (NEW — drives MANIFEST-* category)
Each module exports a typed `lib/modules/{name}/manifest.ts` declaring:
- `required_inputs[]` (e.g., damage_price_list, cancellation_policy)
- `emitted_events[]` (e.g., booking.checked_out, damage.flagged)
- `approval_actions[]` (e.g., damage_charge, rate_change)
- `telegram_callbacks[]` (with product prefix)
- `billing_line_types[]`

Onboarding wizard generates dynamic forms from manifests; Telegram bot registers callbacks from manifests; approval spine action-type registry is manifest-driven. New module = new manifest, no hardcoded wizard branches.

### D. Confirmations of existing decisions (no change)
- D1 (SSO bridge architecture): unchanged
- D2 (no role auto-translate): confirmed by Chris's "ringfenced + linked" requirement
- D5 (PayFast lib copy-paste with sync-version header): unchanged
- D6 (auto-create Trophy org at activation): confirmed (Swazulu = single entity)
- D7 (DB-backed jti replay protection): unchanged
- D8 (DraggonnB-only mobile sweep): unchanged
- D10 (currency display ZAR + ISO): unchanged

### E. Revisions to D3, D4, D9
**D3 (revised) — Default booking checkout offers PayFast Subscribe + EFT-manual; per-tenant config selects available routes; damage flow checks token first, routes to manual collection if absent.** Adds the multi-route reality.

**D4 (revised) — Split-by-default invoice model with optional umbrella invoice. Booker bill is the primary invoice; per-hunter extras tag via `hunter_id`; multi-payer payment links settle slices of the same invoice. Synthetic single-charge unification deferred to v3.2.** Replaces "parallel subscriptions, same card" model.

**D9 (revised) — Single Telegram bot per org with product-tagged callbacks driven by module manifests. Callbacks discovered at runtime from manifests, not hand-wired. Standardised input/output across all clients via the manifest contract.** Adds the manifest layer.

---

## 4. Outstanding artefacts (capture out-of-band, not call-blocking)

These do not gate Phase 13 planning but are required before Phase 15 ships damage code or per-hunter billing for Swazulu specifically:

1. **Swazulu pricing sheet** — finalised lodge nightly rates, hunt day rate, animal price list (kudu, springbok, etc.), PH day rate, vehicle day rate, slaughter rate per animal class.
2. **Itemised damage price list** — full version (R20 glass, R25 plate are the seeds; need the rest). Will seed `tenant_modules.config.accommodation.damage_price_list`.
3. **Vendor SOPs** — taxidermy handover spec + butchery handover spec (carcass quarters, halves, instructions). For Phase 15.5 cross-product handlers + Wave B per-carcass routing.
4. **Cancellation policy JSON** — Swazulu specifically (Chris's verbal version captured above; needs to land in `accommodation_cancellation_policies.tiers JSONB`).
5. **Deposit policy** — same.
6. **Subdomain assignment** — `swa-zulu.draggonnb.co.za` not yet set on org row.
7. **PayFast decision** — does Swazulu open its own merchant or run through DraggonnB-managed? Drives PAYROUTE-* config for the pilot.

---

## 5. Db gaps surfaced by audit

Items currently missing in the live DB that v3.1 plans will need to fill:

| Gap | Where it surfaces | Phase |
|---|---|---|
| Cancellation policies (zero rows) | `accommodation_cancellation_policies` | 15.1 backfill |
| Deposit policies (zero rows) | `accommodation_deposit_policies` | 15.1 backfill |
| Damage price list config | `tenant_modules.config.accommodation` | 15.2 (DAMAGE-08) |
| Stock inventory | `accommodation_stock_items` | onboarding artefact |
| Subdomain | `organizations.subdomain` | provisioning fix |
| `payfast_subscription_token` | `organizations.payfast_subscription_token` | 15.1 (DAMAGE-01/02) |
| Trophy org row | `orgs` table (Trophy schema) | 13 (SSO-11 saga step 10) |
| `cross_product_org_links` | new table | 13 (SSO-09) |
| Polymorphic billing layer | `billing_invoices`/`billing_invoice_lines`/`billing_invoice_payment_links` | 15.0 (NEW INVOICE-*) |
| Per-tenant payment routing | `tenant_modules.config.billing` schema | 15.0 (NEW PAYROUTE-*) |
| Module manifests | `lib/modules/*/manifest.ts` | 13 (NEW MANIFEST-*) |

---

## 6. Net effect on v3.1 scope

Three new requirement categories add ~21 reqs, growing v3.1 from 112 to ~133.

| Category | Count | Phase | Impact |
|---|---|---|---|
| INVOICE-* | 10 | 15 (new sub-plan 15.0 BEFORE 15.1) | Polymorphic billing schema + line emission API + payment link slicing |
| PAYROUTE-* | 5 | 15 (15.0 alongside INVOICE) | Per-tenant routing config, fee calc, EFT-manual fallback |
| MANIFEST-* | 6 | 13 | Module manifest contract, dynamic onboarding form generator, manifest-driven Telegram registry |

Phase 15 grows from 6 sub-plans to 8 (15.0 INVOICE + PAYROUTE foundations becomes the first sub-plan, ahead of 15.1 PayFast Subscribe-token capture). Phase 13 picks up MANIFEST as a foundational layer alongside SSO/NAV/STACK.

GATE-01 marked complete — owner-side knowledge captured here is sufficient to lock architecture for Phase 13. GATE-02 (PayFast sandbox spike) remains the first plan inside Phase 13.

---

*Captured 2026-05-01 — combines DB audit + Chris owner-side knowledge transfer. Authoritative reference for Phase 13/15 planning. Updates here override D3/D4/D9 in REQUIREMENTS.md (revised in same commit).*
