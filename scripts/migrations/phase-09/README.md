# Phase 09 Migration Scripts

One-time or diagnostic scripts supporting Phase 09 (Foundations & Guard Rails).

## Files

- `audit-client-usage-metrics.sql` — Read-only diagnostic for the legacy column-mismatch bug (ERR-029). Run manually in Supabase SQL editor or psql. Output feeds `09-05-PLAN.md` diagnostics report.

## Backfill scripts (added in later plans)

- `backfill-billing-plan-snapshot.ts` — added in Plan 09-02 (populates billing_plan_snapshot for the 8 existing orgs)
- `backfill-subscription-composition.ts` — added in Plan 09-02

## Usage

```bash
# Audit run (read-only)
psql "$DATABASE_URL" -f scripts/migrations/phase-09/audit-client-usage-metrics.sql > tmp/audit-output.txt

# Backfill (once scripts exist in 09-02)
pnpm tsx scripts/migrations/phase-09/backfill-billing-plan-snapshot.ts
```

## Column Mismatch Bug Context

The `client_usage_metrics` table has columns named `posts_monthly` and `ai_generations_monthly`.
Older webhook code references `monthly_posts_used` and `monthly_ai_generations_used` — which do not exist.
This means usage reset calls silently fail (no error thrown, no counter reset).

The audit script surfaces the scope of this drift before Plan 09-05 decides whether to:
1. Rename the webhook references to match actual columns, or
2. Add alias columns, or
3. Migrate all tracking to `usage_events` and deprecate `client_usage_metrics`.
