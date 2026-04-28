---
phase: 11
plan_id: 11-06
title: N8N nightly workflows (engagement-score + drafts cleanup) + provisioning seed
wave: 2
depends_on: [11-01]
files_modified:
  - n8n/wf-crm-engagement-score.json
  - n8n/wf-crm-nightly-cleanup.json
  - scripts/provisioning/steps/04-seed-data.ts
  - lib/provisioning/CLAUDE.md
autonomous: true
estimated_loc: 320
estimated_dev_minutes: 80
---

## Objective

Ship the two nightly N8N workflows that feed Phase 11's CRM Easy view: (1) `wf-crm-engagement-score.json` runs at 02:00 SAST, computes per-contact engagement scores, UPSERTS to `crm_action_suggestions` (RESEARCH A section 5); (2) `wf-crm-nightly-cleanup.json` runs at 03:00 SAST, deletes expired `entity_drafts` (`expires_at < NOW()`) and expired `crm_action_dismissals` (UX-07 cleanup). Also patches the provisioning step that seeds default `tenant_modules.config.crm.stale_thresholds_days` for new orgs (so new tenants get sensible defaults — Plan 11-01's migration 41 only seeds existing orgs).

**v3.0 simplification (RESEARCH A Risk #2):** Engagement score uses `contacts.last_contacted_at` age + manual follow-up flag only. Email open/click/reply scoring deferred to v3.1 when an `email_tracking_events` table is added. JSONB `score_breakdown` schema is forward-compatible — N8N adds keys later without migration.

## must_haves

- `n8n/wf-crm-engagement-score.json` exists as a valid N8N workflow JSON: schedule trigger 02:00 SAST → query orgs with CRM module → for each org, compute scores → UPSERT to `crm_action_suggestions` with `card_type ∈ {followup, hot_lead}`. Telegram alert on >0 errors via existing `TELEGRAM_OPS_CHAT_ID`.
- `n8n/wf-crm-nightly-cleanup.json` exists: schedule trigger 03:00 SAST → DELETE FROM entity_drafts WHERE expires_at < NOW() → DELETE FROM crm_action_dismissals WHERE expires_at < NOW(). Reports row counts on success.
- Workflows use the existing project N8N pattern (Supabase REST API node with service role key, env from N8N credentials store) — match the structure of `n8n/wf-analytics.json` so operator UX is consistent.
- `scripts/provisioning/steps/04-seed-data.ts` (or whichever provisioning step writes `tenant_modules.config`) seeds `config.crm.stale_thresholds_days = {lead:7, qualified:14, proposal:10, negotiation:21}` (REAL DB enum, not CONTEXT.md's diverged stages) when activating CRM for a new org.
- `lib/provisioning/CLAUDE.md` updated with a 2-3 line note about the new seed key and where Easy view reads it from.

## Tasks

<task id="1">
  <title>Create wf-crm-engagement-score.json (nightly engagement-score N8N workflow)</title>
  <files>n8n/wf-crm-engagement-score.json</files>
  <actions>
    Read `n8n/wf-analytics.json` first as a structural reference (existing nightly Supabase-REST-driven workflow pattern). Then craft `wf-crm-engagement-score.json`.

    **Workflow structure** per RESEARCH A section 5:
    1. **Schedule trigger** — cron `0 2 * * *` (02:00 daily, server timezone Africa/Johannesburg).
    2. **Get orgs with CRM module** — Supabase REST `GET /rest/v1/tenant_modules?module_id=eq.crm&select=organization_id&active=eq.true`.
    3. **Split-In-Batches** — 1 org at a time.
    4. **For each org: query stale-eligible contacts and deals**:
       - Followup card: `GET /rest/v1/contacts?organization_id=eq.{{org}}&select=id,last_contacted_at,manual_followup_flag` (defensive — `manual_followup_flag` column may not exist; if not, skip and emit warning via Telegram for v3.1 schema work).
       - Hot lead card: `GET /rest/v1/deals?organization_id=eq.{{org}}&stage=in.(lead,qualified,proposal)&select=id,value,contact_id`. Filter to those with `value > 0` and recent `last_contacted_at`.
    5. **Compute score** in a Function node:
       ```javascript
       // v3.0 simplified scoring (RESEARCH A Risk #2):
       // Real opens/clicks/replies deferred to v3.1.
       const now = new Date()
       return items.map(item => {
         let score = 0
         const breakdown = { manual: 0, recent_contact: 0, deal_value: 0 }
         if (item.manual_followup_flag) { score += 15; breakdown.manual = 15 }
         const daysSinceContact = item.last_contacted_at
           ? (now - new Date(item.last_contacted_at)) / (1000*60*60*24) : 999
         if (daysSinceContact < 7) { score += 5; breakdown.recent_contact = 5 }
         // Hot leads: deal value bonus
         if (item.value && item.value > 5000) { score += 8; breakdown.deal_value = 8 }
         return { entity_id: item.id, score, score_breakdown: breakdown }
       }).filter(r => r.score >= 3)  // RESEARCH A: minimum 3pt threshold
       ```
    6. **UPSERT to crm_action_suggestions** — `POST /rest/v1/crm_action_suggestions` with header `Prefer: resolution=merge-duplicates` for each item:
       ```json
       {
         "organization_id": "{{org_id}}",
         "card_type": "followup" | "hot_lead",
         "entity_type": "contact" | "deal",
         "entity_id": "{{computed.entity_id}}",
         "score": "{{computed.score}}",
         "score_breakdown": "{{computed.breakdown}}",
         "refreshed_at": "{{now}}",
         "n8n_run_id": "{{$execution.id}}"
       }
       ```
    7. **Error handler branch** — on >0 errors in any node, send Telegram message via `sendTelegramMessage` HTTP node to `TELEGRAM_OPS_CHAT_ID`:
       ```
       [CRM Engagement Score Failed]
       Org: {{org_id}}
       Run ID: {{$execution.id}}
       Error: {{error.message}}
       ```

    Keep the workflow simple — small, focused JSON. Use the project's standard N8N service-role credential entry. Do NOT activate the workflow file via API in this plan — Chris activates manually after deploy (matches existing pattern).
  </actions>
  <verification>
    JSON validates: `cat n8n/wf-crm-engagement-score.json | jq . > /dev/null` (no errors).
    Workflow imports cleanly into local N8N: visual check that Schedule trigger + Supabase nodes render.
    Manually invoke once against test org → verify rows appear in `crm_action_suggestions` with `n8n_run_id` populated.
  </verification>
</task>

<task id="2">
  <title>Create wf-crm-nightly-cleanup.json (entity_drafts + dismissals TTL cleanup)</title>
  <files>n8n/wf-crm-nightly-cleanup.json</files>
  <actions>
    Per RESEARCH A section 3 — single-purpose cleanup workflow.

    **Workflow structure:**
    1. **Schedule trigger** — cron `0 3 * * *` (03:00 daily, 1hr after engagement-score to avoid contention).
    2. **Delete expired entity_drafts** — Supabase REST DELETE:
       `DELETE /rest/v1/entity_drafts?expires_at=lt.{{ $now.toISOString() }}` (service role auth header).
    3. **Delete expired crm_action_dismissals**:
       `DELETE /rest/v1/crm_action_dismissals?expires_at=lt.{{ $now.toISOString() }}`.
    4. **Set node** — capture row counts (Supabase REST returns deleted rows in body when `Prefer: return=representation` set).
    5. **(Optional) Telegram success summary** — only if `count > 100` to avoid noise: `[CRM Cleanup] Deleted {n_drafts} drafts + {n_dismissals} dismissals`.
    6. **Error branch** — Telegram alert on failure (same pattern as workflow 1).

    Keep it minimal. Reuse the same Supabase REST credential as wf-1.
  </actions>
  <verification>
    `cat n8n/wf-crm-nightly-cleanup.json | jq . > /dev/null` valid.
    Workflow imports into N8N visual editor without errors.
    Manual invocation deletes only rows where `expires_at < NOW()` — test by inserting one draft with `expires_at = NOW() - INTERVAL '1 hour'` and one with future expiry; only the expired row should be deleted.
  </verification>
</task>

<task id="3">
  <title>Patch provisioning step to seed CRM stale-threshold defaults for new orgs + docs</title>
  <files>scripts/provisioning/steps/04-seed-data.ts, lib/provisioning/CLAUDE.md</files>
  <actions>
    First identify the right provisioning step file — likely `scripts/provisioning/steps/04-seed-data.ts` or wherever `tenant_modules` rows are inserted/configured during org provisioning. `grep -r "tenant_modules" scripts/provisioning/` to confirm.

    In the appropriate step, when activating the `crm` module for a new org, ensure `config.crm.stale_thresholds_days` is seeded with:
    ```json
    {"lead": 7, "qualified": 14, "proposal": 10, "negotiation": 21}
    ```
    Use real DB enum values (RESEARCH A section 6, NOT the CONTEXT.md `discovery/qualification/closing` divergence). Pattern:
    ```typescript
    const crmConfigDefaults = {
      stale_thresholds_days: { lead: 7, qualified: 14, proposal: 10, negotiation: 21 },
    }
    // Merge with any existing config (defensive — don't blow away other keys)
    config: { ...existing.crm, ...crmConfigDefaults }
    ```

    Patch `lib/provisioning/CLAUDE.md` — add a 2-3 line subsection under "Step 04 — seed-data" or wherever appropriate:
    ```markdown
    ### CRM stale-thresholds seed (Phase 11)
    The seed-data step writes `tenant_modules.config.crm.stale_thresholds_days` with sensible defaults
    (lead:7, qualified:14, proposal:10, negotiation:21 days). Easy view's stale-deals card reads this
    JSONB key. Existing orgs were backfilled by migration 41.
    ```
  </actions>
  <verification>
    `grep -A 3 "stale_thresholds_days" scripts/provisioning/steps/04-seed-data.ts` returns the seed object.
    `npm test -- provisioning` — provisioning tests still pass (no regression).
    `grep "stale_thresholds_days" lib/provisioning/CLAUDE.md` returns at least one line.
  </verification>
</task>

## Verification

- Both N8N JSON files validate as valid JSON.
- Manual import into local N8N + dry-run against a test tenant produces the expected upserts/deletes.
- Provisioning step generates correct seed for a fresh org (verify via `npm test` of provisioning suite).
- Telegram error branch tested by intentionally pointing engagement-score to a bad table name → confirm alert fires.
- No code changes to `lib/agents/` or `lib/campaigns/` here — strictly N8N + provisioning.

## Out of scope

- Do NOT compute engagement score from email opens/clicks/replies in v3.0 — `email_tracking_events` table doesn't exist yet (RESEARCH A Risk #2 escape hatch (b)). v3.1 work.
- Do NOT add the cleanup logic into the engagement-score workflow — keep them separate (single-responsibility N8N).
- Do NOT use pg_cron for these jobs — N8N is consistent with existing 19+ workflows in `n8n/`. pg_cron is reserved for Campaign Studio scheduling (Plan 11-11) where pg_net + HMAC pattern is needed.
- Do NOT write a campaign-related workflow here — Plan 11-11 owns campaign scheduling.
- Do NOT activate workflows programmatically — operator activates after deploy (matches existing pattern, "manual activate" is in MEMORY.md session-handoff).

## REQ-IDs closed

- (Foundational for) UX-05 (N8N nightly job — the cache that 11-07 reads). Full UX-05 closure happens in Plan 11-07 where the page data fetcher proves no per-render agent calls happen at render time.
