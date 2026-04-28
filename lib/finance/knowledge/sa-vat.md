# SA VAT — Tourism & F&B

> **Status:** TEMPLATE — awaiting Chris's VDJ knowledge dump.

## Plain-English summary

_[Fill in: What is VAT for SA SMEs? When must a lodge/restaurant register? What's the threshold in 2026?]_

## The rules (as of YYYY-MM-DD)

### Registration threshold
_[R1M turnover? Voluntary registration rules? Deregistration?]_

### Standard rate
_[15% standard as of last check — confirm if changed. Zero-rated items relevant to tourism/F&B?]_

### Tourism-specific
_[Non-resident VAT refunds, short-term accommodation rules, flat-rate scheme if applicable?]_

### F&B-specific
_[Alcohol levy interaction, prepared food rules, delivery vs dine-in?]_

## How DraggonnB applies it

**Accommodation:**
- Where VAT shows on booking confirmations
- How it appears in owner statements (net of VAT for owner share?)
- Monthly VAT report format

**Restaurant:**
- VAT on bill (line-level or summary)
- Cash-up day-end VAT breakdown
- Tips treatment (inclusive/exclusive of VAT — see tips-treatment.md)

Code paths:
- `lib/accommodation/finance/vat.ts` (to be built)
- `lib/restaurant/finance/vat.ts` (to be built)

## Edge cases

- _[Non-resident guests — proof required, refund mechanism]_
- _[Corporate bookings with VAT invoice requirements]_
- _[Gift vouchers — VAT at sale or redemption?]_
- _[Cancellations and refunds — VAT adjustment]_
- _[Mixed-use bookings (accommodation + F&B combined)]_

## When to re-check this file

- Annual budget speech (usually February) — rate or threshold changes
- SARS publishes new interpretation note relevant to tourism
- Any client raises a SARS audit finding
