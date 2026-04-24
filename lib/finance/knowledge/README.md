# DraggonnB Finance Knowledge Base

SA-specific financial, tax, and accounting knowledge — sourced from Chris's work with VDJ Accounting. Productized into the Accommodation and Restaurant vertical modules.

## Structure

This directory is read by `lib/accommodation/finance/` and `lib/restaurant/finance/`. Both verticals import shared SA rules from here and layer vertical-specific logic on top.

```
lib/finance/knowledge/
  README.md                    (this file)
  sa-vat.md                    SA VAT rules (tourism, F&B, thresholds)
  sars-reports.md              SARS-friendly day-end + VAT201 formats
  tourism-levies.md            Tourism levy, TBCSA, bed levy variations
  owner-payouts.md             Owner-share calculations, payout cadence
  tips-treatment.md            F&B tip allocation, PAYE implications
  expense-categories.md        SARS expense codes for receipt categorisation
  deposit-handling.md          Refundable vs non-refundable, contract terms
```

Each knowledge file follows a consistent shape so it can be loaded into prompts and consulted by code.

## File template

```markdown
# [Topic]

## Plain-English summary
One paragraph: what this is and why it matters for an SME owner.

## The rules (as of [YYYY-MM-DD])
Specific rules, rates, thresholds. Cite SARS/regulator source where possible.

## How DraggonnB applies it
Which vertical, which screen, which calculation. Point to code paths where
it gets used.

## Edge cases
Non-resident guests, corporate bookings, gift vouchers, chargebacks, etc.

## When to re-check this file
What triggers a review (annual budget, rate changes, new VAT threshold).
```

## Priority files to populate (in order)

Chris — when you have 30 focused minutes, dump what you know into these files.
Raw dumps are fine; I'll format and structure afterwards.

1. **sa-vat.md** — highest-impact for both verticals
2. **sars-reports.md** — day-end format for Restaurant, monthly for Accom
3. **owner-payouts.md** — differentiator for lodges with multiple unit owners
4. **tourism-levies.md** — accommodation-specific
5. **tips-treatment.md** — restaurant-specific
6. **expense-categories.md** — needed for Finance-AI add-on receipt OCR
7. **deposit-handling.md** — covers both verticals

## Consumption pattern (design)

```ts
// lib/finance/knowledge/loader.ts
import { readFileSync } from 'fs'
import path from 'path'

export function loadKnowledge(topic: string): string {
  return readFileSync(path.join(__dirname, `${topic}.md`), 'utf-8')
}

// In a finance agent prompt:
const prompt = `You are a SA accountant for a lodge.

<knowledge>
${loadKnowledge('sa-vat')}
${loadKnowledge('tourism-levies')}
</knowledge>

Calculate the VAT breakdown for this booking...`
```

Knowledge is cached via Anthropic prompt caching (system message) so repeated
agent calls don't re-pay for the context.

## Scope boundary

- **IN:** SA-specific tax/accounting rules, SARS formats, industry norms
- **OUT:** Client-specific data (that lives in DB per tenant), generic accounting
  theory (knowledge is pointed, not comprehensive), advice for non-SA markets
