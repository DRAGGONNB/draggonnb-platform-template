#!/usr/bin/env bash
# scripts/diagnostics/phase-09/find-client-usage-metrics-callsites.sh
#
# Ripgrep-based callsite finder for client_usage_metrics.
# Reusable in Phase 10 (USAGE-13) to track cleanup progress.
#
# Usage: bash scripts/diagnostics/phase-09/find-client-usage-metrics-callsites.sh
#
# Output: matched lines with file:line format. Redirect to file for archival.
#
# FINDINGS from 2026-04-26 execution:
#   Write sites: 5 files (subscriptions.ts, feature-gate.ts, email/send, email/campaigns/send)
#   Read sites:  same files (read before write for cap-check)
#   Zero callers of checkUsage/incrementUsage in app/ routes (feature-gate is imported but
#   only autopilot/chat, autopilot/generate, content/generate/* actually call it)
#   Zero callers of handlePaymentComplete in app/ (dead code path — superseded by 09-02 ITN rewrite)

set -euo pipefail

echo "=== client_usage_metrics WRITE sites ==="
rg -n "client_usage_metrics" \
  --glob '!.planning/**' \
  --glob '!__tests__/**' \
  --glob '!supabase/migrations/**' \
  --glob '!scripts/diagnostics/**' \
  --glob '!node_modules/**' \
  lib/ app/ 2>/dev/null || echo "(none found)"

echo ""
echo "=== Legacy column names referenced in code ==="
rg -n "posts_monthly|ai_generations_monthly|monthly_posts_used|monthly_ai_generations_used|reset_date|emails_sent_monthly|agent_invocations_monthly|autopilot_runs_monthly" \
  --glob '!.planning/**' \
  --glob '!supabase/migrations/**' \
  --glob '!scripts/diagnostics/**' \
  --glob '!node_modules/**' \
  lib/ app/ 2>/dev/null || echo "(none found)"

echo ""
echo "=== checkUsage callers (legacy path) ==="
rg -n "checkUsage|incrementUsage" \
  --glob '!.planning/**' \
  --glob '!__tests__/**' \
  --glob '!node_modules/**' \
  app/ 2>/dev/null || echo "(none found)"

echo ""
echo "=== guardUsage callers (new path) ==="
rg -n "guardUsage" \
  --glob '!.planning/**' \
  --glob '!__tests__/**' \
  --glob '!node_modules/**' \
  app/ lib/ 2>/dev/null || echo "(none found)"

echo ""
echo "=== handlePaymentComplete callers ==="
rg -n "handlePaymentComplete" \
  --glob '!.planning/**' \
  --glob '!__tests__/**' \
  --glob '!node_modules/**' \
  app/ lib/ 2>/dev/null || echo "(none found)"

echo ""
echo "=== record_usage_event callers ==="
rg -n "record_usage_event" \
  --glob '!.planning/**' \
  --glob '!supabase/migrations/**' \
  --glob '!node_modules/**' \
  lib/ app/ 2>/dev/null || echo "(none found)"
