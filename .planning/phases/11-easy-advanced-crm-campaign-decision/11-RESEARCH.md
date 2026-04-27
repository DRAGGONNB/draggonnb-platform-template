# Phase 11 Research: Easy/Advanced CRM PoC + Campaign Studio Decision Gate

**Generated:** 2026-04-27 via 2 parallel research spawns (the prior single-spawn run timed out at 64min/66 tool calls — split scope avoided that)

- **Part A** — CRM Easy/Advanced UX (UX-01..07): ModuleHome, action cards, drafts, view-desync, ui_mode
- **Part B** — Campaign Studio scaffold (CAMP-01..08): channel adapters, SMS gateway, brand-safety, kill switch, scheduling

Both parts retained verbatim below. Cross-references between parts noted where relevant (brand voice integration, BaseAgent extension pattern, migration sequencing).

---

# Phase 11: CRM Easy/Advanced UX — Research Part A (Researcher A)

**Researched:** 2026-04-27
**Domain:** Next.js RSC + Supabase + shadcn/ui — CRM UX pattern
**Scope:** UX-01..07 only (Campaign Studio / SMS in Researcher B)

---

## 1. `<ModuleHome>` Architecture

### File Location
```
components/module-home/ModuleHome.tsx          -- RSC wrapper (no 'use client')
components/module-home/ActionCard.tsx          -- Client island ('use client')
components/module-home/ActionCardItem.tsx      -- Client island
components/module-home/ToggleViewButton.tsx    -- Client island (floating pill)
```

### Manifest Shape (TypeScript interface)

```typescript
// components/module-home/types.ts

export type CardSourceKind =
  | 'sql_page_load'           // Pure SQL on every RSC render
  | 'cached_suggestions'      // Reads crm_action_suggestions (nightly cache)
  | 'combined'                // SQL on load + cached overlay

export interface ActionCardManifest {
  id: string                  // e.g. 'followups', 'stale_deals', 'hot_leads'
  title: string
  description: string
  emptyStateCTA: string       // "Add your first deal" etc.
  maxItems: 5
  sourceKind: CardSourceKind
  // RSC passes server-fetched items; client island owns approve/dismiss mutations
}

export interface ModuleHomeProps {
  module: string              // 'crm' | 'email' | etc.
  cards: ActionCardManifest[]
  initialData: ModuleHomeData // pre-fetched server-side; typed per module
  userRole: 'admin' | 'manager' | 'user'
  uiMode: 'easy' | 'advanced'
  organizationId: string
  hasBrandVoice: boolean      // drives fallback banner
}

// CRM-specific initial data shape
export interface CRMModuleHomeData {
  followups: FollowupItem[]
  staleDeals: StaleDealItem[]
  hotLeads: HotLeadItem[]
  dismissals: DismissalMap   // { [suggestionId]: expires_at }
}
```

### RSC vs Client Island Split

The RSC (`ModuleHome.tsx`) fetches all data server-side at render time (SQL queries + crm_action_suggestions reads). It passes serialized data down to client islands via props. Client islands own:
- Approve button state + 5s undo countdown timer
- Dismiss mutation (POST to API route)
- View-switch navigation (router.push)

**Pattern already used in codebase:** `app/(dashboard)/layout.tsx` shows the RSC-fetches-data, passes to `UsageWarningBanner` (client) pattern. Use the same approach.

### Prop Contract for Action Cards

```typescript
// Client island receives:
interface ActionCardProps {
  cardId: string
  title: string
  items: ActionCardItem[]       // max 5, already filtered
  totalCount: number            // for "View all in Advanced" link
  hasBrandVoice: boolean
  onApprove: (itemId: string, action: ApproveAction) => Promise<void>
  onDismiss: (itemId: string) => Promise<void>
}

type ApproveAction =
  | { type: 'send_email' }
  | { type: 'snooze_1d' }
  | { type: 'decide'; choice: 'engage' | 'archive' | 'snooze' }
  | { type: 'engage_hot_lead' }
```

### Route Structure (UX-02)

```
app/(dashboard)/crm/page.tsx              -- BECOMES Easy view (ModuleHome RSC)
app/(dashboard)/crm/advanced/page.tsx     -- NEW Advanced view (existing kanban+filters)
```

The current `app/(dashboard)/crm/page.tsx` is a stats overview, NOT a kanban. Its content should move to `advanced/page.tsx`. The Easy view replaces the root `/crm` page.

**Redirect logic:** `page.tsx` reads `user_profiles.ui_mode`; if `advanced`, redirects to `/crm/advanced`. This keeps URLs stable and honors user preference without client-side flickering.

---

## 2. `crm_action_suggestions` Table

### Full CREATE TABLE

```sql
-- Migration 36: crm_action_suggestions
-- Purpose: Cache for nightly N8N engagement-score + hot-lead scoring
-- Written by N8N; read by Easy view RSC on page load

CREATE TABLE IF NOT EXISTS crm_action_suggestions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Which card this suggestion feeds
  card_type       TEXT        NOT NULL
                  CHECK (card_type IN ('followup', 'hot_lead')),
                  -- 'stale_deals' is computed pure SQL; not cached here
  
  -- Target entity
  entity_type     TEXT        NOT NULL CHECK (entity_type IN ('contact', 'deal')),
  entity_id       UUID        NOT NULL,   -- contacts.id or deals.id
  
  -- Scoring payload (flexible JSONB for N8N to evolve without migration)
  score           INTEGER     NOT NULL DEFAULT 0,   -- engagement score (pts)
  score_breakdown JSONB       NOT NULL DEFAULT '{}',
  -- e.g. {"opens_7d": 2, "clicks_7d": 1, "replies_7d": 0}
  
  -- Freshness gate: Easy view only renders if refreshed_at > NOW() - INTERVAL '25h'
  refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- N8N run metadata
  n8n_run_id      TEXT,       -- workflow execution ID for traceability
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per org+card+entity; N8N does UPSERT
  UNIQUE (organization_id, card_type, entity_id)
);

CREATE INDEX idx_crm_action_suggestions_org_card
  ON crm_action_suggestions (organization_id, card_type)
  WHERE refreshed_at > NOW() - INTERVAL '25 hours'; -- partial index for freshness

CREATE INDEX idx_crm_action_suggestions_score
  ON crm_action_suggestions (organization_id, card_type, score DESC);

-- Trigger
CREATE TRIGGER update_crm_action_suggestions_updated_at
  BEFORE UPDATE ON crm_action_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
ALTER TABLE crm_action_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_suggestions FORCE ROW LEVEL SECURITY;

CREATE POLICY "crm_action_suggestions_org_read" ON crm_action_suggestions
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- N8N uses service role for writes (no user-facing write policy needed)
CREATE POLICY "crm_action_suggestions_service_role" ON crm_action_suggestions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Justification per Column

- `card_type`: Discriminates which Easy view card reads this row. Stale deals excluded — computed pure SQL.
- `entity_type + entity_id`: Allows the page RSC to JOIN back to contacts/deals for display name.
- `score`: Composite engagement point total. Used to ORDER within card (DESC).
- `score_breakdown`: JSONB for N8N to store `opens_7d`, `clicks_7d`, `replies_7d` without future migrations.
- `refreshed_at`: Staleness gate. Page renders card only if `refreshed_at > NOW() - INTERVAL '25h'` (nightly runs at 02:00 + 1hr buffer). Falls back to empty card with "Syncing..." message if stale.
- `n8n_run_id`: Traceability — link Easy view display back to a specific N8N execution in logs.

### Refresh Strategy

N8N writes via `UPSERT` (Supabase PostgREST `POST + Prefer: resolution=merge-duplicates`). Page-load SQL filters `WHERE refreshed_at > NOW() - INTERVAL '25 hours'` to avoid showing yesterday's stale data if N8N failed overnight.

---

## 3. `entity_drafts` Table

### Full CREATE TABLE

```sql
-- Migration 37: entity_drafts
-- Purpose: Store unsaved form state across view switches (UX-06, UX-07)

CREATE TABLE IF NOT EXISTS entity_drafts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What entity this draft belongs to
  entity_type     TEXT        NOT NULL,   -- 'contact', 'deal', 'company'
  entity_id       UUID,                   -- NULL = new-entity draft (unsaved record)
  
  -- Draft content
  draft_data      JSONB       NOT NULL DEFAULT '{}',
  
  -- Conflict detection: last writer's timestamp
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- TTL cleanup hook: nightly cron deletes WHERE expires_at < NOW()
  expires_at      TIMESTAMPTZ NOT NULL
                  DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One draft per user per entity
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_drafts_org_user
  ON entity_drafts (organization_id, user_id);

CREATE INDEX idx_entity_drafts_entity
  ON entity_drafts (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

CREATE INDEX idx_entity_drafts_expires
  ON entity_drafts (expires_at)
  WHERE expires_at < NOW() + INTERVAL '8 days'; -- cleanup cron target

CREATE TRIGGER update_entity_drafts_updated_at
  BEFORE UPDATE ON entity_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
ALTER TABLE entity_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_drafts FORCE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "entity_drafts_owner_read" ON entity_drafts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "entity_drafts_owner_write" ON entity_drafts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "entity_drafts_service_role" ON entity_drafts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Nightly Cleanup

**Recommendation: N8N cron (not pg_cron).** Reason: pg_cron is a Supabase extension that requires manual enablement; the project already has 22 N8N workflows (including nightly jobs like `wf-analytics.json` which runs daily at 06:00). Adding cleanup to an existing nightly N8N job avoids adding Supabase extension dependencies.

```json
// Add to nightly N8N workflow (or new wf-crm-nightly.json):
// DELETE FROM entity_drafts WHERE expires_at < NOW()
// Trigger: Schedule 03:00 SAST (after engagement-score run at 02:00)
```

N8N cleanup SQL via Supabase REST:
```
DELETE /rest/v1/entity_drafts?expires_at=lt.{{ $now.toISOString() }}
```

---

## 4. `user_profiles.ui_mode` Column

### Migration Plan (OPS-05 multi-step)

**Step 1 — Migration 38: Add column NULLABLE**
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ui_mode TEXT; -- NULL = not yet set

COMMENT ON COLUMN user_profiles.ui_mode IS
  'User view preference: easy | advanced. NULL = role default applies.
   Set by toggle button click; read by getUserOrg() and CRM page RSC.';

CREATE INDEX IF NOT EXISTS user_profiles_ui_mode_idx
  ON user_profiles (id, ui_mode);
```

**Step 2 — Code ships (reads NULL as role-default)**

The page RSC resolves effective mode as:
```typescript
function resolveUiMode(uiMode: string | null, role: string): 'easy' | 'advanced' {
  if (uiMode === 'easy' || uiMode === 'advanced') return uiMode
  // Role defaults (locked decisions)
  if (role === 'manager') return 'advanced'
  return 'easy' // admin, user
}
```

**Step 3 — No backfill needed.** NULL = "use role default" is the correct permanent semantic. NOT NULL constraint is not needed; NULL carries meaning (unset preference).

**No Migration 39 (NOT NULL) needed** — NULL is load-bearing semantics, not a data quality gap. This is an exception to OPS-05 step 4 that the planner should document.

### Where Role-Default Logic Lives

NOT in a DB trigger (triggers on `user_profiles` fire on writes, not reads). NOT in `getUserOrg()` (it doesn't read `user_profiles.ui_mode` today; adding it would increase latency on every authenticated request).

**Recommended: CRM page RSC only.** The RSC reads `user_profiles.ui_mode` directly via admin client at CRM page render time. The `resolveUiMode()` helper above lives in `lib/crm/ui-mode.ts`. The toggle API route writes the column.

API route: `app/api/crm/ui-mode/route.ts` — `POST { mode: 'easy' | 'advanced' }` — updates `user_profiles.ui_mode` for the authenticated user. Called by the toggle button's click handler (client island).

**`getUserOrg()` is NOT modified** — it's called on every dashboard page and adding an extra query would hurt all module load times for one module's feature.

---

## 5. Engagement-Score Formula

### Proposed Weights

| Signal | Points | Justification |
|--------|--------|---------------|
| Email open (7d window) | 1 pt each | Low-intent signal; many opens are automated (mail client preload). Mailchimp industry research shows open-rate is 40% lower accuracy post-iOS 15. |
| Email click (7d window) | 3 pts each | High-intent: requires deliberate action. HubSpot's lead scoring framework weights click 3-4x vs open. |
| Email reply (7d window) | 10 pts each | Highest-intent: indicates active buyer. Outreach.io and HubSpot both classify reply as primary buying signal. |
| Manual "follow up" flag | 15 pts (one-time) | User override: always surfaces above algorithmic signals. |
| Inbound form submit / call request | 8 pts | Active inbound intent (for hot_lead card). |

**Minimum score to appear in card:** 3 pts (open-only). This ensures a contact who opened email once appears but ranks low. A contact with 1 click (3 pts) appears at same rank — acceptable.

**Confidence: MEDIUM** — weights sourced from HubSpot and Mailchimp industry documentation (training data, not live-verified). Planner should note these as initial values to tune after first 2 tenants.

### Computation Flow

```
N8N Workflow: wf-crm-engagement-score.json (new file)
Trigger: Schedule — 02:00 SAST (Africa/Johannesburg)

Node sequence:
1. Fetch email_events (last 7d) per org from Resend webhook data
   (stored in crm_activities or separate email_tracking table — TBD, see Risk #2)
2. For each contact: compute score from opens/clicks/replies
3. For deals: inherit contact score + deal value threshold check (hot_lead)
4. UPSERT to crm_action_suggestions via Supabase REST
5. Telegram ops alert if >0 errors (TELEGRAM_OPS_CHAT_ID)
```

**Recommended trigger time: 02:00 SAST** — chosen because:
- VPS analytics workflow runs at 06:00 SAST (`wf-analytics.json`)
- N8N onboarding workflows run during business hours
- 02:00 SAST = 00:00 UTC — low DB load, Vercel crons typically at 00:xx UTC
- 25h freshness window means a 02:00 SAST run is valid until 03:00 SAST next day

---

## 6. Stale-Threshold Seed Defaults

### Proposed Values

The `deals` table has stages: `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost`.
Context.md used `discovery/qualification/negotiation/closing` — this diverges from actual DB enum. Planner must align.

**Mapping to DB enum:**

```json
{
  "crm": {
    "stale_thresholds_days": {
      "lead": 7,
      "qualified": 14,
      "proposal": 10,
      "negotiation": 21
    }
  }
}
```

**Reasoning:**
- `lead` → 7 days: Early stage, high attrition if ignored. SA SME sales cycles shorter than enterprise.
- `qualified` → 14 days: Prospect is identified; 2 weeks without contact signals stall.
- `proposal` → 10 days: Shorter than qualification — proposal sent, decision expected sooner. Missing this is highest revenue risk.
- `negotiation` → 21 days: Longer cycles expected; 3 weeks gives room for multi-party decisions.
- `won` / `lost` stages excluded from stale logic (terminal states).

### Seeding Migration

```sql
-- In provisioning step OR as a one-time backfill in migration 38 (with ui_mode):
-- For existing orgs that have tenant_modules.module_id = 'crm':

UPDATE tenant_modules
SET config = jsonb_set(
  COALESCE(config, '{}'),
  '{crm}',
  jsonb_set(
    COALESCE(config->'crm', '{}'),
    '{stale_thresholds_days}',
    '{"lead": 7, "qualified": 14, "proposal": 10, "negotiation": 21}'::jsonb
  )
)
WHERE module_id = 'crm'
  AND (config->'crm'->'stale_thresholds_days') IS NULL;
```

This is safe on existing rows — JSONB update with IS NULL guard, no data loss.

---

## 7. `crm_activities` Extension

### New Columns Needed

`crm_activities` does NOT currently exist as a named table in migrations (only referenced in CONTEXT.md as an intended target). There is no `03_crm_tables.sql` entry for it, and no API routes reference it. This means the planner must **create it**, not extend it.

However, the CONTEXT.md locks `source='easy_view'` as a field on `crm_activities`. Treat this as "create the table with these columns from the start" — simpler than a two-step add.

### Full CREATE TABLE (new table, not an extension)

```sql
-- Migration 36 (same as crm_action_suggestions — or 37, planner decides):
CREATE TABLE IF NOT EXISTS crm_activities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who did the action
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Target entity
  entity_type     TEXT        NOT NULL CHECK (entity_type IN ('contact', 'deal', 'company')),
  entity_id       UUID        NOT NULL,
  
  -- What happened
  action_type     TEXT        NOT NULL
                  CHECK (action_type IN (
                    'email_sent',
                    'stage_moved',
                    'task_created',
                    'note_added',
                    'deal_archived',
                    'snoozed',
                    'dismissed'
                  )),
  
  -- Which surface triggered it
  source          TEXT        NOT NULL DEFAULT 'advanced'
                  CHECK (source IN ('easy_view', 'advanced', 'automation', 'api')),
  
  -- Flexible payload (email subject, stage_from/to, snooze_until, etc.)
  metadata        JSONB       NOT NULL DEFAULT '{}',
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_activities_org_entity
  ON crm_activities (organization_id, entity_type, entity_id, created_at DESC);

CREATE INDEX idx_crm_activities_source
  ON crm_activities (organization_id, source)
  WHERE source = 'easy_view'; -- for Easy view audit reports
```

**RLS:** Same org pattern as all CRM tables.

### OPS-05 Note

Since `crm_activities` is a NEW table (not altering an existing one), OPS-05 multi-step discipline does not apply. Create with all columns in migration 36.

---

## 8. 5-Second Undo Toast Pattern

### Library Decision

**Use the existing `@radix-ui/react-toast` implementation** — already in `package.json` (`@radix-ui/react-toast@^1.1.5`), already used via `components/ui/toast.tsx` + `hooks/use-toast.ts` + `components/ui/toaster.tsx`.

**Do NOT add `sonner`** — it would be a second toast library. The existing Radix toast is functional and project-consistent.

**Do NOT add `react-hot-toast`** — same reason.

### 5-Second Undo Architecture (in-memory)

The action queue is **in-memory only** (no Redis, no DB row). Process:

```typescript
// In ActionCardItem.tsx (client island)
const [pendingActions, setPendingActions] = useState<Map<string, PendingAction>>(new Map())

async function handleApprove(itemId: string, action: ApproveAction) {
  // 1. Show undo toast immediately
  const toastId = toast({
    title: "Sending email...",
    description: "Tap Undo to cancel",
    action: <ToastAction onClick={() => cancelAction(itemId)}>Undo</ToastAction>,
    duration: 5000,  // 5s auto-dismiss
  })
  
  // 2. Register pending action
  const timer = setTimeout(async () => {
    // 3. After 5s, commit action via API
    await fetch('/api/crm/easy-view/approve', {
      method: 'POST',
      body: JSON.stringify({ itemId, action, organizationId })
    })
    setPendingActions(prev => { prev.delete(itemId); return new Map(prev) })
  }, 5000)
  
  setPendingActions(prev => new Map(prev).set(itemId, { timer, toastId }))
}

function cancelAction(itemId: string) {
  const pending = pendingActions.get(itemId)
  if (pending) {
    clearTimeout(pending.timer)
    dismiss(pending.toastId)
    setPendingActions(prev => { prev.delete(itemId); return new Map(prev) })
  }
}
```

**Why in-memory (not DB row)?** The 5s window is too short for pessimistic DB locking (race with network latency). In-memory is correct: if the user closes the tab, the action is lost — acceptable because they navigated away. The alternative (DB "pending" row) adds a migration and cleanup cron for marginal UX improvement.

### Test Strategy

```typescript
// __tests__/components/crm/ActionCardItem.test.tsx
// 1. Render card with items
// 2. Click "Send email" on first item
// 3. Assert toast appears with "Undo" action
// 4. vi.advanceTimersByTime(4999) → assert API NOT called
// 5. vi.advanceTimersByTime(5001) → assert POST /api/crm/easy-view/approve called
// 6. Separate test: click Undo within 5s → assert timer cleared, API NOT called
```

Use `vi.useFakeTimers()` from Vitest (already used in project). No extra test libraries needed.

### Toast Position

The existing `ToastViewport` in `components/ui/toast.tsx` uses:
```
"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
```

This is top-center mobile, bottom-right desktop — NOT the locked decision (bottom-center mobile-safe). The planner must override `ToastViewport` className for the Easy view toast specifically, or add a new `UndoToastViewport` component:

```typescript
// Override viewport position for Easy view undo toast
className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[100] w-auto max-w-[360px]"
// 80px from bottom clears iOS Safari toolbar (matches toggle button 80px offset)
// left-1/2 + -translate-x-1/2 = centered
```

---

## 9. Toggle Button Responsive Component

### Desktop Float (bottom-right, 16px from edges, 56x40px)

```typescript
// components/module-home/ToggleViewButton.tsx ('use client')
export function ToggleViewButton({ 
  currentMode, 
  onToggle 
}: { currentMode: 'easy' | 'advanced'; onToggle: () => void }) {
  const isEasy = currentMode === 'easy'
  const label = isEasy ? 'Advanced view →' : 'Easy view →'
  // Defensive: if destination === current (should not happen), show grayed label
  
  return (
    <button
      onClick={onToggle}
      className={cn(
        // Fixed position, z-index above page content but below modals
        "fixed z-40",
        // Desktop: bottom-right, 56x40px pill
        "bottom-4 right-4 h-10 w-auto min-w-[56px] px-3",
        // Mobile (360px breakpoint): 80px from bottom, 16px from right
        // 80px clears iOS Safari bottom toolbar + Android nav bar
        "sm:bottom-4 sm:right-4",
        "bottom-20 right-4",   // 80px = bottom-20 (20 * 4px = 80px)
        // safe-area-inset for iPhone notch/home-indicator
        "pb-safe",  // requires tailwind-safe-area-inset plugin OR inline style
        // Visual style
        "rounded-full bg-white border border-gray-200 shadow-md",
        "text-sm font-medium text-gray-700",
        "hover:bg-gray-50 hover:shadow-lg transition-all",
        "flex items-center gap-1.5"
      )}
      aria-label={label}
    >
      {label}
    </button>
  )
}
```

### Safe-Area Inset Handling

The project uses `tailwindcss@^3.4.1` without a safe-area plugin. For the 80px mobile offset, use an inline style:

```typescript
style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
```

This covers iOS Safari home indicator (34px on iPhone X+) without a plugin. The `bottom-20` (80px) already provides headroom for standard Android nav bars.

**Note on `pb-safe`:** This class does NOT exist in the current project's Tailwind config. Do not use it without adding the `tailwindcss-safe-area` plugin. Use `env(safe-area-inset-bottom)` inline style instead.

### Defensive micro-copy when destination = current view

If somehow the button renders with `currentMode` matching destination (bug state), show:
```
"You are here →"  // grayed, pointer-events-none
```

This should never happen in normal flow since the button is only shown on the CRM page and reads `currentMode` from server-rendered prop. Add a runtime guard:

```typescript
if (currentMode === targetMode) {
  return null // don't render a broken toggle
}
```

---

## 10. Easy/Advanced View-Desync Prevention

### Concrete Merge Strategy

On view-load, the RSC fetches both the DB record AND the user's draft (if one exists):

```typescript
// In CRM Easy page RSC:
async function loadDealWithDraft(dealId: string, userId: string, orgId: string) {
  const [dbRecord, draft] = await Promise.all([
    supabase.from('deals').select('*').eq('id', dealId).single(),
    supabase.from('entity_drafts')
      .select('draft_data, last_modified_at')
      .eq('user_id', userId)
      .eq('entity_type', 'deal')
      .eq('entity_id', dealId)
      .maybeSingle()
  ])
  
  if (!draft.data) return dbRecord.data  // no draft, render DB state
  
  // Overlay draft on DB state (draft wins field-by-field)
  return {
    ...dbRecord.data,
    ...draft.data.draft_data,
    _hasDraft: true,
    _draftModifiedAt: draft.data.last_modified_at
  }
}
```

### Conflict Detection (60-second last-write-wins)

The client island checks `last_modified_at` on load:

```typescript
// If draft.last_modified_at > NOW() - 60s AND draft was written from a different tab
// (detected by sessionStorage tab ID), show conflict banner:
"This draft was edited from another tab"  [Reload]
```

Tab identity: store a random UUID in `sessionStorage` at mount. Include `tab_id` in `entity_drafts.draft_data` JSONB. On load, if stored `tab_id !== current tab_id` AND `last_modified_at > 60s ago`, show banner.

### Integration Test Outline (UX-06)

```typescript
// __tests__/integration/crm/view-desync.test.ts

it('edits in Easy view are visible in Advanced view after switch', async () => {
  // 1. Render Easy view with a deal
  // 2. Simulate user editing deal name (keystroke + 1s debounce)
  // 3. Verify POST to /api/crm/drafts with draft_data.name = new value
  // 4. Render Advanced view (simulate route change)
  // 5. Verify Advanced view query includes draft overlay
  // 6. Assert displayed deal name = edited value
})

it('switching back to Easy view does not lose unsaved draft', async () => {
  // 1. Render Easy view, edit field (draft saved)
  // 2. Click "Advanced view →" (navigate away)
  // 3. Click "Easy view →" (return)
  // 4. Verify draft_data loaded from entity_drafts
  // 5. Assert field shows drafted value, not DB value
})
```

---

## 11. Brand-Voice Template Fallback

### Detection

Read `client_profiles.brand_voice_updated_at` on Easy view RSC load:

```typescript
// In CRM Easy page RSC (alongside other data fetches):
const { data: voiceProfile } = await supabase
  .from('client_profiles')
  .select('brand_voice_updated_at')
  .eq('organization_id', organizationId)
  .maybeSingle()

const hasBrandVoice = Boolean(voiceProfile?.brand_voice_updated_at)
```

`brand_voice_updated_at` is NULL if wizard never run (per migration 31 schema). `brand_voice_prompt` being NULL is the primary signal, but `brand_voice_updated_at` is more efficient to SELECT (single column vs TEXT blob).

Pass `hasBrandVoice: boolean` as a prop to `<ModuleHome>` and down to each `<ActionCard>`.

### Banner UX

When `!hasBrandVoice` AND user is about to trigger an email send action:
- Show inline banner ABOVE the action card (not as a toast — toasts are transient, this needs to be persistent until wizard complete).
- Text: `Complete your brand voice in 30 seconds for personalised outreach →`
- The `→` is a `<Link href="/settings/brand-voice">` 
- Email STILL sends (with generic professional template) — the banner is informational, NOT a blocker.

Generic fallback template (hardcoded in `lib/crm/email-templates.ts`):
```
Subject: Following up with you
Body: "Hi [First Name], I wanted to follow up on our previous conversation..."
```

---

## 12. Risks, Unknowns, and Escape Hatches

### Risk 1: `crm_activities` does not exist in live DB (HIGH PRIORITY)

No migration in `supabase/migrations/` creates `crm_activities`. CONTEXT.md assumes it exists. The planner MUST include a CREATE TABLE migration for `crm_activities` as one of the first migration steps in Plan 11-01.

### Risk 2: Email tracking data source for engagement score

The engagement-score N8N workflow needs email open/click/reply events. Resend provides webhooks for these events, but the current codebase has NO email tracking table. Migration 02 (`email_automation`) has email sending tables but no tracking events table. The planner must either:
- (a) Create `email_tracking_events` table in Plan 11-01 migrations, OR
- (b) Scope engagement score to "manual follow-up flag only" for v3.0, with opens/clicks as v3.1

**Recommendation (b):** Ships faster. N8N `wf-crm-engagement-score.json` scores contacts by `contacts.last_contacted_at` age + manual flag only. The JSONB `score_breakdown` schema is pre-designed to add opens/clicks later without migration.

### Risk 3: `user_profiles` schema not in migrations

`user_profiles` table is referenced in `lib/auth/get-user-org.ts` and provisioning scripts, but there is NO migration file that creates it. It exists in the live DB (provisioning step 01 inserts into it), but the planner has no definitive column list. The `ui_mode` migration must include a `CREATE TABLE IF NOT EXISTS user_profiles` guard:

```sql
-- Guard in migration 38:
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Then:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_mode TEXT;
```

### Risk 4: `deals` table stage enum does NOT match CONTEXT.md

CONTEXT.md phase boundary mentions `discovery/qualification/negotiation/closing` stages.  
Actual DB (`03_crm_tables.sql`): `lead, qualified, proposal, negotiation, won, lost`.  
The stale-threshold defaults MUST use the actual DB enum values (see Section 6 above).

### Risk 5: Floating toggle button z-index conflicts with existing modal z-indices

Current modals use Radix UI Dialog (default `z-50`). The toggle button should be `z-40` so modals render above it. The existing `ToastViewport` uses `z-[100]`. Undo toast must remain above toggle button.

### Risk 6: `deals.assigned_to` for task assignment in Hot Lead "Engage" action

The hot lead "Engage" action creates a "call within 24h" task assigned to `deals.assigned_to`. But there is no `crm_tasks` table in the schema. Planner must create it in Plan 11-01 migrations OR reassign the "task created" to just a `crm_activities` row with `action_type='task_created'` and metadata `{ due_at, assignee_id }`. The latter avoids a new table and uses the existing audit trail pattern.

**Recommendation:** Use `crm_activities` with `action_type='task_created'` and a future `crm_tasks` table when full task management is needed (v3.1).

### Risk 7: Migration index numbering

STATE.md says "next migration index = 36+". Current highest committed migration is `35_drop_legacy_usage.sql`. Plan 11 migrations should start at 36. Confirm against live Supabase DB at plan-execution time.

---

## RESEARCH COMPLETE

`.planning/phases/11-easy-advanced-crm-campaign-decision/11-RESEARCH-PART-A-crm.md`


---

# Phase 11 Research Part B — Campaign Studio (CAMP-01..08)

**Researcher:** Claude Code (Researcher B)
**Date:** 2026-04-27
**Scope:** CAMP-01..08 only. CRM Easy/Advanced UX-01..07 is Researcher A's domain.

---

## 1. SMS Gateway Recommendation

### Ranked Comparison (SA Market)

| Provider | ZAR per SMS (est.) | API Style | Free Sandbox | Delivery Receipts | Opt-Out / RICA/POPIA |
|---|---|---|---|---|---|
| **BulkSMS** | R0.18–R0.25 (local SA) | REST + SMPP | Yes (test credits) | Yes (webhook DLR) | Built-in STOP/OPTOUT handling; POPIA-aware opt-out list |
| **SMS Portal** | R0.19–R0.28 | REST | Yes (10 free credits) | Yes (push DLR + pull) | Manual opt-out management; POPIA guidance docs |
| **Clickatell** | R0.22–R0.35 | REST (One API) | Yes (sandbox env) | Yes (webhook DLR) | Channel-level opt-out; global routing may exit SA SMSC |
| **Twilio** | R0.45–R0.80 (USD billed) | REST | Yes | Yes | Global opt-out, POPIA gap — US company, DPA not SA-native |

### Recommendation: BulkSMS

**Rationale:** BulkSMS is SA-headquartered (Cape Town), routes via direct SA SMSC (Vodacom, MTN, Cell C, Telkom), charges in ZAR, has a clean REST API with JSON payloads, returns synchronous delivery receipts, and provides a POPIA-compliant opt-out list per sender ID. Cheapest per-message at scale. Clickatell is viable fallback if BulkSMS is unavailable; Twilio adds FX risk.

**BulkSMS API basics:**
- `POST https://api.bulksms.com/v1/messages`
- Auth: Basic auth with API token ID + secret (env: `BULKSMS_TOKEN_ID`, `BULKSMS_TOKEN_SECRET`)
- Body: `{ "to": "+2782xxxxxxx", "body": "text", "from": "DraggonnB" }`
- Delivery receipt webhook: configure in BulkSMS console → POST to `/api/campaigns/sms-dlr`

---

## 2. Campaign Data Model

### Multi-Step Migration Plan (OPS-05)

Migration index starts at 36. Split into 4 migrations, each single-purpose.

**Migration 36 — `campaigns` table (nullable, no FK constraints yet):**

```sql
-- 36_campaigns_table.sql
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_review', 'scheduled', 'running', 'completed', 'failed', 'killed');
CREATE TYPE campaign_channel AS ENUM ('email', 'sms', 'facebook', 'instagram', 'linkedin');

CREATE TABLE campaigns (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT         NOT NULL,
  intent              TEXT         NOT NULL,  -- user's raw input ("promote Sunday brunch")
  status              campaign_status NOT NULL DEFAULT 'draft',
  -- scheduling
  scheduled_at        TIMESTAMPTZ,
  channels            campaign_channel[] NOT NULL DEFAULT '{}',
  -- 30-day enforcement (CAMP-08)
  force_review        BOOLEAN      NOT NULL DEFAULT false,
  -- audit
  created_by          UUID,        -- auth.users(id), nullable initially (OPS-05 step 1)
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
```

**Migration 37 — `campaign_drafts` (per-channel draft content):**

```sql
-- 37_campaign_drafts_table.sql
CREATE TABLE campaign_drafts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID          NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel          campaign_channel NOT NULL,
  -- content
  subject          TEXT,         -- email subject
  body_html        TEXT,         -- email HTML or post caption
  body_text        TEXT,         -- plain text / SMS body
  media_urls       TEXT[]        DEFAULT '{}',
  -- safety
  brand_safe       BOOLEAN,      -- null = not yet checked; true/false = Haiku result
  safety_flags     TEXT[]        DEFAULT '{}',  -- list of flag reasons from CAMP-07
  -- state
  is_approved      BOOLEAN       NOT NULL DEFAULT false,
  approved_at      TIMESTAMPTZ,
  regeneration_count INTEGER     NOT NULL DEFAULT 0,
  -- AI generation metadata
  agent_session_id UUID,         -- references agent_sessions(id)
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_drafts FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_campaign_drafts_campaign ON campaign_drafts(campaign_id);
CREATE INDEX idx_campaign_drafts_org ON campaign_drafts(organization_id);
CREATE UNIQUE INDEX idx_campaign_drafts_unique_channel ON campaign_drafts(campaign_id, channel);
```

**Migration 38 — `campaign_runs` + `campaign_run_items`:**

```sql
-- 38_campaign_runs_tables.sql
CREATE TYPE run_status AS ENUM ('pending', 'executing', 'completed', 'failed', 'killed');
CREATE TYPE run_item_status AS ENUM ('pending', 'sent', 'failed', 'skipped', 'verified');

CREATE TABLE campaign_runs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id   UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            run_status   NOT NULL DEFAULT 'pending',
  -- pg_cron job reference
  cron_job_name     TEXT UNIQUE, -- format: 'campaign_run_{id}' used for cron.unschedule()
  -- timing
  scheduled_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  -- summary
  items_total       INTEGER      DEFAULT 0,
  items_sent        INTEGER      DEFAULT 0,
  items_failed      INTEGER      DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE campaign_run_items (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID          NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  campaign_draft_id UUID         NOT NULL REFERENCES campaign_drafts(id),
  channel          campaign_channel NOT NULL,
  status           run_item_status NOT NULL DEFAULT 'pending',
  -- delivery details
  recipient_ref    TEXT,         -- email address, phone number, page_id
  provider_message_id TEXT,      -- Resend email ID, BulkSMS batch ID, FB post ID, etc.
  published_url    TEXT,         -- CAMP-05: URL of published post (social) or null (email/sms)
  -- timing
  sent_at          TIMESTAMPTZ,
  verified_at      TIMESTAMPTZ,
  -- errors
  error_code       TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_run_items FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_campaign_runs_org ON campaign_runs(organization_id);
CREATE INDEX idx_campaign_runs_campaign ON campaign_runs(campaign_id);
CREATE INDEX idx_campaign_run_items_run ON campaign_run_items(run_id);
```

**Migration 39 — RLS policies (separate from DDL, OPS-05):**

```sql
-- 39_campaign_rls_policies.sql
-- campaigns
CREATE POLICY campaigns_org_read ON campaigns
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaigns_org_write ON campaigns
  FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaigns_service_role ON campaigns
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- campaign_drafts
CREATE POLICY campaign_drafts_org_read ON campaign_drafts
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaign_drafts_org_write ON campaign_drafts
  FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaign_drafts_service_role ON campaign_drafts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- campaign_runs
CREATE POLICY campaign_runs_org_read ON campaign_runs
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaign_runs_service_role ON campaign_runs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- campaign_run_items (service_role only — users read via run join)
CREATE POLICY campaign_run_items_service_role ON campaign_run_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

**Kill switch storage:** Store in `tenant_modules.config` JSONB for the `campaigns` module row. Key: `campaigns.kill_switch_active` (boolean). No new table needed — it's the right location since kill switch is per-module per-tenant. Admin RPC updates it. Details in section 7.

---

## 3. Channel Adapter Pattern

### Base interface — `lib/campaigns/adapters/types.ts`

```typescript
export type ChannelId = 'email' | 'sms' | 'facebook' | 'instagram' | 'linkedin'

export interface SendResult {
  success: boolean
  providerMessageId?: string
  publishedUrl?: string   // social channels return post URL after publish
  error?: string
  errorCode?: string
}

export interface VerifyResult {
  found: boolean
  publishedUrl?: string
  error?: string
}

export interface ChannelAdapter {
  channelId: ChannelId
  /** Returns true when this channel can actually send (not just draft) */
  enabled(): boolean
  /** Send a single draft to the channel. Returns providerMessageId. */
  send(draft: CampaignDraftPayload): Promise<SendResult>
  /** Post-publish verify: fetch the posted item and confirm it exists. */
  verify(providerMessageId: string, orgId: string): Promise<VerifyResult>
}

export interface CampaignDraftPayload {
  bodyText: string
  bodyHtml?: string    // email only
  subject?: string     // email only
  mediaUrls?: string[]
  recipientRef?: string  // email address or phone number
  organizationId: string
}
```

### File structure

```
lib/campaigns/
  adapters/
    types.ts          -- ChannelAdapter interface, CampaignDraftPayload, SendResult
    email.ts          -- EmailAdapter (Resend)
    sms.ts            -- SmsAdapter (BulkSMS)
    facebook.ts       -- FacebookAdapter (credential-gated)
    instagram.ts      -- InstagramAdapter (credential-gated)
    linkedin.ts       -- LinkedInAdapter (credential-gated)
    index.ts          -- getAdapter(channelId, orgId) factory
  agent/
    campaign-drafter.ts      -- CampaignDrafterAgent extends BaseAgent
    brand-safety-checker.ts  -- BrandSafetyAgent extends BaseAgent
  scheduler.ts        -- pg_cron scheduling helpers
  kill-switch.ts      -- per-tenant kill switch read/write
```

### EmailAdapter (Resend)

```typescript
// lib/campaigns/adapters/email.ts
import { sendEmail } from '@/lib/email/resend'
import type { ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class EmailAdapter implements ChannelAdapter {
  channelId = 'email' as const

  enabled(): boolean {
    return !!process.env.RESEND_API_KEY
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    const result = await sendEmail({
      to: draft.recipientRef!,
      subject: draft.subject ?? '(No subject)',
      html: draft.bodyHtml ?? draft.bodyText,
      text: draft.bodyText,
    })
    return {
      success: result.success,
      providerMessageId: result.messageId,
      error: result.error,
    }
  }

  async verify(providerMessageId: string): Promise<VerifyResult> {
    // Resend: GET /emails/{id} returns delivery status
    // Treat "delivered" or "opened" as verified; "bounced"/"failed" as not found
    const resp = await fetch(`https://api.resend.com/emails/${providerMessageId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    if (!resp.ok) return { found: false, error: `Resend API ${resp.status}` }
    const data = await resp.json() as { last_event: string }
    const verified = ['delivered', 'opened', 'clicked'].includes(data.last_event)
    return { found: verified }
  }
}
```

### SmsAdapter (BulkSMS)

```typescript
// lib/campaigns/adapters/sms.ts
import type { ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class SmsAdapter implements ChannelAdapter {
  channelId = 'sms' as const

  enabled(): boolean {
    return !!(process.env.BULKSMS_TOKEN_ID && process.env.BULKSMS_TOKEN_SECRET)
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    const credentials = Buffer.from(
      `${process.env.BULKSMS_TOKEN_ID}:${process.env.BULKSMS_TOKEN_SECRET}`
    ).toString('base64')

    const resp = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: draft.recipientRef,
        body: draft.bodyText,
        from: process.env.BULKSMS_SENDER_ID ?? 'DraggonnB',
      }),
    })
    const data = await resp.json() as Array<{ id: string; status: { type: string } }>
    const msg = data[0]
    if (!resp.ok || !msg) return { success: false, error: `BulkSMS ${resp.status}` }
    return { success: true, providerMessageId: msg.id }
  }

  async verify(providerMessageId: string): Promise<VerifyResult> {
    // BulkSMS: GET /v1/messages/{id}
    const credentials = Buffer.from(
      `${process.env.BULKSMS_TOKEN_ID}:${process.env.BULKSMS_TOKEN_SECRET}`
    ).toString('base64')
    const resp = await fetch(`https://api.bulksms.com/v1/messages/${providerMessageId}`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (!resp.ok) return { found: false }
    const data = await resp.json() as { status: { type: string } }
    return { found: data.status?.type === 'DELIVERED' }
  }
}
```

### Social adapters (credential-gated, mocked)

```typescript
// lib/campaigns/adapters/facebook.ts
import type { ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class FacebookAdapter implements ChannelAdapter {
  channelId = 'facebook' as const

  enabled(): boolean {
    return !!process.env.META_APP_ID
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    if (!this.enabled()) {
      return { success: false, error: 'Facebook not connected. Set META_APP_ID to enable.' }
    }
    // Real implementation: POST /{page_id}/feed with page_access_token from social_accounts
    // For now: throw; gating in API route prevents reaching here when disabled
    throw new Error('FacebookAdapter.send: not yet implemented (credential-gated)')
  }

  async verify(providerMessageId: string, orgId: string): Promise<VerifyResult> {
    if (!this.enabled()) return { found: false, error: 'Facebook not connected' }
    // GET /{post_id}?fields=id,permalink_url&access_token=...
    throw new Error('FacebookAdapter.verify: not yet implemented')
  }
}
// InstagramAdapter and LinkedInAdapter follow identical structure
// LinkedIn: enabled() = !!process.env.LINKEDIN_CLIENT_ID
```

### Adapter factory

```typescript
// lib/campaigns/adapters/index.ts
import { EmailAdapter } from './email'
import { SmsAdapter } from './sms'
import { FacebookAdapter } from './facebook'
import { InstagramAdapter } from './instagram'
import { LinkedInAdapter } from './linkedin'
import type { ChannelAdapter, ChannelId } from './types'

const ADAPTERS: Record<ChannelId, ChannelAdapter> = {
  email: new EmailAdapter(),
  sms: new SmsAdapter(),
  facebook: new FacebookAdapter(),
  instagram: new InstagramAdapter(),
  linkedin: new LinkedInAdapter(),
}

export function getAdapter(channelId: ChannelId): ChannelAdapter {
  return ADAPTERS[channelId]
}

export function getEnabledChannels(): ChannelId[] {
  return (Object.keys(ADAPTERS) as ChannelId[]).filter(id => ADAPTERS[id].enabled())
}
```

### Mock/test pattern

For tests, replace the factory with jest `vi.mock()`:

```typescript
vi.mock('@/lib/campaigns/adapters', () => ({
  getAdapter: (channelId: string) => ({
    channelId,
    enabled: () => true,
    send: vi.fn().mockResolvedValue({ success: true, providerMessageId: 'mock-id-123' }),
    verify: vi.fn().mockResolvedValue({ found: true, publishedUrl: 'https://mock.url/post/123' }),
  }),
}))
```

---

## 4. Credential Gating Runtime Check

### API route guard pattern

In `app/api/campaigns/[id]/publish/route.ts`:

```typescript
import { getAdapter } from '@/lib/campaigns/adapters'

const adapter = getAdapter(channel)
if (!adapter.enabled()) {
  return Response.json(
    { error: `Channel '${channel}' is not connected. Configure credentials to enable.` },
    { status: 422 }
  )
}
```

### UI greyed-out channel pattern (RSC-safe)

In the campaign studio channel selector component:

```typescript
// app/(dashboard)/campaigns/studio/[id]/_components/ChannelSelector.tsx
// Pass enabled state from server via props (RSC fetches env presence server-side)
interface ChannelOption {
  id: ChannelId
  label: string
  enabled: boolean
  ctaText?: string  // shown when disabled
}

// Server component (page.tsx) builds the list:
const channels: ChannelOption[] = [
  { id: 'email', label: 'Email', enabled: !!process.env.RESEND_API_KEY },
  { id: 'sms', label: 'SMS', enabled: !!(process.env.BULKSMS_TOKEN_ID) },
  { id: 'facebook', label: 'Facebook', enabled: !!process.env.META_APP_ID,
    ctaText: 'Connect Facebook to enable' },
  { id: 'instagram', label: 'Instagram', enabled: !!process.env.META_APP_ID,
    ctaText: 'Connect Instagram to enable' },
  { id: 'linkedin', label: 'LinkedIn', enabled: !!process.env.LINKEDIN_CLIENT_ID,
    ctaText: 'Connect LinkedIn to enable' },
]
```

Disabled channel tiles render with `opacity-40 cursor-not-allowed` and the `ctaText` as an inline badge. Clicking a disabled tile opens an inline drawer (shadcn `Sheet`) with "The studio is there, social channels activate when Meta approves your account."

---

## 5. pg_cron + pg_net Scheduling

### CAMP-03: schedule a campaign run

```sql
-- Called from /api/campaigns/[runId]/schedule after user approves
-- HMAC-signed payload to prevent unauthorized execution
SELECT cron.schedule(
  'campaign_run_' || run_id::text,                    -- job name (also stored in campaign_runs.cron_job_name)
  'at ' || to_char(scheduled_at AT TIME ZONE 'UTC', 'MI HH24 DD MM') || ' *',  -- one-time cron expression
  format(
    $$ SELECT net.http_post(
      url := %L,
      headers := '{"Content-Type":"application/json","x-internal-hmac":"%s"}'::jsonb,
      body := ('{"run_id":"%s"}')::jsonb
    ) $$,
    current_setting('app.base_url') || '/api/campaigns/execute',
    encode(hmac(run_id::text, current_setting('app.internal_secret'), 'sha256'), 'hex'),
    run_id
  )
);
```

**Notes:**
- `app.base_url` and `app.internal_secret` are Supabase DB secrets set via `ALTER DATABASE SET`.
- The HMAC check in `app/api/campaigns/execute/route.ts` verifies `x-internal-hmac` before processing.
- pg_net returns the call to Vercel asynchronously; the cron job itself exits immediately.
- Store `cron_job_name = 'campaign_run_' || run_id::text` in `campaign_runs` at schedule time.

### One-time vs recurring

v3.0 campaigns are **one-time only** (send once at scheduled_at). Recurring is deferred to v3.1. One-time cron expressions use a specific minute/hour/day/month.

### Kill switch cancellation

```sql
-- RPC: cancel_org_campaign_runs(org_id UUID)
CREATE OR REPLACE FUNCTION cancel_org_campaign_runs(p_org_id UUID)
RETURNS INTEGER  -- count of jobs cancelled
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  job_name TEXT;
  cancelled INTEGER := 0;
BEGIN
  FOR job_name IN
    SELECT cron_job_name FROM campaign_runs
     WHERE organization_id = p_org_id
       AND status IN ('pending', 'executing')
       AND cron_job_name IS NOT NULL
  LOOP
    PERFORM cron.unschedule(job_name);
    cancelled := cancelled + 1;
  END LOOP;

  UPDATE campaign_runs
     SET status = 'killed', completed_at = now()
   WHERE organization_id = p_org_id
     AND status IN ('pending', 'executing');

  RETURN cancelled;
END;
$$;
```

---

## 6. Post-Publish Verification (CAMP-05)

### Per-channel strategy

| Channel | Verification approach | Data stored |
|---|---|---|
| Email | Resend `GET /emails/{id}` — check `last_event` in `['delivered','opened','clicked']` | `provider_message_id` = Resend email ID |
| SMS | BulkSMS `GET /v1/messages/{id}` — check `status.type == 'DELIVERED'` | `provider_message_id` = BulkSMS message ID |
| Facebook | Graph API `GET /{post_id}?fields=id,permalink_url` with page_access_token | `published_url` = permalink_url |
| Instagram | Graph API `GET /{media_id}?fields=id,permalink` | `published_url` = permalink |
| LinkedIn | LinkedIn API `GET /ugcPosts/{id}` — check `lifecycleState = PUBLISHED` | `published_url` = constructed from id |

### Timing

Verification runs as a **follow-up step** 5 minutes after `campaign_run_items.sent_at` via a separate pg_cron job scheduled at send time:

```sql
SELECT cron.schedule(
  'verify_run_' || run_id::text,
  'at ' || to_char((now() + INTERVAL '5 minutes') AT TIME ZONE 'UTC', 'MI HH24 DD MM') || ' *',
  format($$ SELECT net.http_post(url := %L, body := ('{"run_id":"%s"}')::jsonb) $$,
    current_setting('app.base_url') || '/api/campaigns/verify', run_id)
);
```

`/api/campaigns/verify` iterates `campaign_run_items` for the run, calls `adapter.verify()` per item, updates `verified_at`, `published_url`, and sets `status = 'verified'` or `'failed'`.

### Where URLs land

`campaign_run_items.published_url TEXT` — nullable, set only after verify succeeds. The Campaign Run Detail page queries this column and renders channel-specific "View live post" links.

---

## 7. Per-Tenant Kill Switch (CAMP-06)

### DB storage

Store in `tenant_modules.config` JSONB for the `campaigns` module row:

```json
{ "kill_switch_active": true, "kill_switch_activated_at": "2026-04-27T10:00:00Z", "kill_switch_reason": "Client request" }
```

**Why not a new table:** tenant_modules already has one row per org per module with a config JSONB. Adding a column here avoids a new table and a new migration for what is logically module configuration.

**Read pattern in API routes:**

```typescript
const { data: mod } = await supabase
  .from('tenant_modules')
  .select('config')
  .eq('organization_id', orgId)
  .eq('module_id', 'campaigns')
  .single()

const killSwitchActive = (mod?.config as { kill_switch_active?: boolean })?.kill_switch_active ?? false
if (killSwitchActive) {
  return Response.json({ error: 'Campaign sends are paused for this account.' }, { status: 423 })
}
```

### Admin UI route

`/admin/clients/[id]/campaigns/kill-switch` — protected by `platform_admin` role check.

Page content:
- Current status badge (Active / Paused)
- "Emergency Stop All Campaigns" red button
- Confirmation dialog: "This will cancel all scheduled sends for [org name] immediately. Continue?"
- On confirm: calls `/api/admin/campaigns/kill-switch` (POST) with `{ orgId, active: true, reason }`
- Re-enable: same page, green "Resume Campaigns" button

### Kill switch API route

`app/api/admin/campaigns/kill-switch/route.ts` (POST):

```typescript
// 1. Verify caller is platform_admin
// 2. UPDATE tenant_modules SET config = config || '{"kill_switch_active": true, ...}' WHERE org + module = campaigns
// 3. Call cancel_org_campaign_runs(orgId) RPC
// 4. Send Telegram alert (section 12c)
// 5. Return { cancelled: N }
```

---

## 8. Brand-Safety Haiku Check (CAMP-07)

### Agent class — `lib/campaigns/agent/brand-safety-checker.ts`

```typescript
import { BaseAgent } from '@/lib/agents/base-agent'
import type { AgentConfig } from '@/lib/agents/types'

export interface SafetyFlagResult {
  safe: boolean
  flags: Array<{
    type: 'off_brand' | 'insensitive' | 'time_inappropriate' | 'forbidden_topic'
    reason: string
    excerpt: string
  }>
  recommendation: 'approve' | 'revise' | 'reject'
}

const BRAND_SAFETY_CONFIG: AgentConfig = {
  agentType: 'campaign_brand_safety',  // add to AgentType union in types.ts
  model: 'claude-haiku-4-5-20251001',  // always Haiku — cost-controlled
  maxTokens: 512,
  temperature: 0,  // deterministic safety decisions
  systemPrompt: `You are a brand safety reviewer for an SME marketing platform operating in South Africa.
Your job: evaluate marketing copy for BRAND SAFETY violations only.

Check for:
1. OFF_BRAND: Copy contradicts the brand's stated values, tone, or forbidden topics
2. INSENSITIVE: References events, groups, or situations likely to cause offence in SA context
3. TIME_INAPPROPRIATE: Festive/celebratory content during active public mourning or national tragedy
4. FORBIDDEN_TOPIC: Explicitly listed forbidden topics appear in the draft

Output ONLY valid JSON matching this schema:
{
  "safe": boolean,
  "flags": [{ "type": "off_brand|insensitive|time_inappropriate|forbidden_topic", "reason": "...", "excerpt": "..." }],
  "recommendation": "approve|revise|reject"
}

"approve" = safe=true and no flags
"revise" = 1-2 minor flags, fixable
"reject" = content fundamentally inappropriate`
}

export class BrandSafetyAgent extends BaseAgent {
  constructor() {
    super(BRAND_SAFETY_CONFIG)
  }

  protected parseResponse(response: string): SafetyFlagResult {
    // Strip markdown fences if present
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned) as SafetyFlagResult
  }
}
```

### Rate budget

- Budget: **20 safety checks per tenant per day** (stored in `ai_usage_ledger`; query `agent_type = 'campaign_brand_safety'` for today's count before calling).
- Cost at Haiku pricing (~R0.002 per 1K input tokens, R0.01 per 1K output): ~R0.01 per check. 20/day = R0.20/day per tenant.
- Implementation: check count in API route before instantiating agent; return `{ error: 'Brand safety check limit reached for today' }` with status 429.

### Trigger

Called from `POST /api/campaigns/[id]/drafts/[draftId]/check-safety` after user saves draft content. Not called on every keystroke — triggered explicitly or before approval.

### UI surface

`campaign_drafts.brand_safe` column:
- `null` = not yet checked → show "Check brand safety" button
- `true` = passes → green badge "Brand safe"
- `false` = flagged → amber/red badge "Review flags" → click to expand `safety_flags[]` in the approval screen

---

## 9. First-30-Days Draft-Then-Review Enforcement (CAMP-08)

### Computation

```typescript
// lib/campaigns/enforcement.ts
export async function isInNewTenantPeriod(orgId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizations')
    .select('activated_at')
    .eq('id', orgId)
    .single()

  if (!data?.activated_at) return true  // no activation date = treat as new

  const activatedAt = new Date(data.activated_at as string)
  const daysSince = (Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < 30
}
```

### Enforcement points

**API route guard** (primary enforcement — `app/api/campaigns/[id]/schedule/route.ts`):

```typescript
const inNewTenantPeriod = await isInNewTenantPeriod(orgId)
if (inNewTenantPeriod && !campaign.force_review) {
  // Coerce to draft-then-review mode regardless of request body
  scheduleMode = 'pending_review'
}
```

**UI hint** (secondary): when `inNewTenantPeriod = true`, the campaign publish button reads "Submit for Review" instead of "Schedule". A persistent amber banner appears in the Campaign Studio header: "Your account is in the guided period (first 30 days). All campaigns require review before sending."

**Override path for trusted tenants:** `platform_admin` can set `campaigns.force_review = true` on the tenant row (via admin UI at `/admin/clients/[id]/campaigns`), which signals "bypass 30-day restriction for this tenant." The `campaigns` table has `force_review BOOLEAN DEFAULT false` — when set to true by admin, the 30-day gate is skipped for that org.

The column name is admittedly counter-intuitive: `force_review = true` means admin has explicitly overridden the restriction. Consider naming it `skip_new_tenant_gate` in planning for clarity.

---

## 10. Brand Voice Integration

### How Campaign Studio invokes brand-voice-aware BaseAgent

Phase 10 already wired brand voice into BaseAgent. The `CampaignDrafterAgent` (extending BaseAgent) gets brand voice **automatically** — no additional code required.

**Call site confirmation:** `BaseAgent.run()` at line 263 in `lib/agents/base-agent.ts`:

```typescript
const brandVoice = orgId ? await this.loadBrandVoice(orgId) : null
const systemBlocks = buildSystemBlocks(orgId ?? 'unknown', agentInstructions, brandVoice)
```

`loadBrandVoice()` fetches `client_profiles.brand_voice_prompt` for the org. If the wizard has not been run (NULL), brand voice block is omitted silently. The `CampaignDrafterAgent` only needs to pass `organizationId` in `AgentRunOptions` — the rest is automatic.

**CampaignDrafterAgent system prompt** should be campaign-drafting specific instructions only (channels, format, tone guidelines). It does NOT need to duplicate brand voice — that arrives via Block 2 automatically.

**Fallback when brand_voice_prompt is NULL:** Draft generation still runs using agent instructions only. UI shows banner: "Complete your brand voice setup for more personalised campaigns."

---

## 11. Campaign Studio UI Shape

### Pages and file structure

```
app/(dashboard)/campaigns/
  page.tsx                      -- Campaign list (RSC) — shadcn Table, status badges
  new/page.tsx                  -- Intent entry (RSC shell + client island)
  studio/[id]/
    page.tsx                    -- Studio composer (RSC fetches campaign + drafts)
    _components/
      IntentForm.tsx            -- Client island: intent text input + "Generate drafts" button
      ChannelSelector.tsx       -- Client island: channel pill selector (disabled = greyed)
      DraftCard.tsx             -- Client island: per-channel draft card + inline edit + regenerate
      BrandSafetyBadge.tsx      -- Client: shows null/true/false safety state
    approval/page.tsx           -- Approval screen (RSC shell + client island)
    _components/
      ApprovalList.tsx          -- Client: list of drafts with approve/edit/regenerate per item
      PublishConfirmModal.tsx   -- Client: shadcn Dialog with channel icons + account name preview
  runs/
    page.tsx                    -- Campaign runs list (RSC)
    [runId]/page.tsx            -- Run detail (RSC): per-item status, verified URLs, errors
  admin/
    kill-switch/page.tsx        -- Platform admin only: kill switch toggle (RSC + server action)
```

### RSC vs client islands

- **RSC:** all data-fetching pages (list, run detail). Fetch from Supabase directly.
- **Client islands:** anything with user interaction (intent form, inline draft editing, approval actions, channel selector). Use `'use client'` directive.
- **Server Actions:** approve campaign (`/app/actions/campaigns.ts`), regenerate draft, toggle kill switch.

### shadcn components used

- `Card`, `CardHeader`, `CardContent` — draft cards
- `Badge` — status badges, safety badges, channel indicators
- `Dialog` — publish confirm modal (CAMP-04)
- `Textarea` — inline draft editing
- `Button` — approve, regenerate, submit for review, kill switch
- `Alert` — 30-day enforcement banner, brand voice missing banner
- `Tabs` — channel tabs in studio composer
- `Sheet` — social channel "Connect to enable" drawer
- `Separator`, `Skeleton` — loading states

---

## 12. Telegram Operator Alerts

Reuse `sendTelegramMessage()` pattern from `lib/accommodation/telegram/ops-bot.ts`. Campaign alerts go to the global `TELEGRAM_OPS_CHAT_ID` environment variable (not per-department channels — campaign ops is platform-level).

Create `lib/campaigns/telegram-alerts.ts`:

### (a) Campaign run failure

```
[Campaign Run Failed]

Org: {org_name} ({org_id})
Campaign: {campaign_name}
Run ID: {run_id}
Channel: {channel}
Error: {error_message}

{N}/{total} items failed. Check /admin/clients/{org_id}/campaigns/runs/{run_id}
```

### (b) Brand-safety flag tripped

```
[Brand Safety Flag]

Org: {org_name}
Campaign: {campaign_name}
Channel: {channel}
Flag type: {off_brand | insensitive | time_inappropriate | forbidden_topic}
Reason: {flag.reason}
Excerpt: "{flag.excerpt}"

Draft is blocked from publishing. Tenant notified in-app.
```

### (c) Kill switch activated by platform admin

```
[Kill Switch Activated]

Org: {org_name} ({org_id})
Activated by: {admin_user_email}
Reason: {reason}
Scheduled runs cancelled: {count}

To re-enable: /admin/clients/{org_id}/campaigns/kill-switch
```

All three alert functions accept a `supabase` client (not used for DB — only for consistency with existing pattern) and `TELEGRAM_OPS_CHAT_ID` from `process.env`.

---

## 13. Risks / Unknowns / Escape Hatches

### pg_cron one-time scheduling reliability

pg_cron does not natively support "run once at exact datetime" — it uses cron syntax which has minute-level resolution. Workaround: schedule for the nearest minute, accept up to 59s drift. For v3.0 this is acceptable. Escape hatch: if exact timing matters in v3.1, switch to a Vercel Cron job (1-minute resolution from Next.js config) that polls `campaign_runs WHERE scheduled_at <= now() AND status = 'pending'`.

### pg_net + Vercel cold starts

`pg_net.http_post` fires the HTTP request from the Supabase DB network. Vercel serverless functions may cold-start. Set a 30s timeout on the pg_net call. If cold start exceeds timeout, the campaign_run stays `pending` — a cleanup cron (`*/15 * * * *`) should detect stale `pending` runs older than 30 minutes and mark them `failed`.

### BulkSMS sender ID registration

SA carriers require pre-registered alphanumeric sender IDs (DraggonnB). Registration can take 1-5 business days. Planner must schedule this as a pre-launch dependency. Fallback: use a short numeric sender code while registration is in progress.

### POPIA / opt-out for SMS campaigns

Clients must maintain opt-out lists. BulkSMS tracks STOP responses per sender. Platform must surface a UI for clients to manage subscriber opt-outs (not in CAMP scope — flag as a v3.1 requirement). For v3.0, platform relies on BulkSMS's built-in STOP handling and instructs clients to only send to opted-in lists.

### Brand-safety check quota exhaustion

If a tenant hits the 20/day Haiku quota, drafts become unchecked. Decision: allow publishing unchecked drafts after quota exhaustion WITH a warning banner ("Brand safety check quota reached — proceed at your own discretion?"). Admin can raise the limit in `tenant_modules.config.campaigns.safety_check_daily_limit`.

### social_accounts table FK reference

`social_accounts` table (migration 04) references the legacy `users` table (`created_by UUID REFERENCES users(id)`). When reading `page_access_token` for FB/IG publishing, query via `organization_id` only — do not join through `created_by`. The table exists and has `page_id`, `page_access_token` columns ready for use by adapters once credentialed.

### `AgentType` union must be updated

Before shipping `CampaignDrafterAgent` and `BrandSafetyAgent`, add `'campaign_drafter'` and `'campaign_brand_safety'` to the `AgentType` union in `lib/agents/types.ts`. Failure to do this causes TypeScript build errors.

### Kill switch and pg_cron job names

If a tenant has hundreds of scheduled campaigns, `cancel_org_campaign_runs` iterates them all. For v3.0 tenant counts this is fine. At 100+ concurrent campaigns per tenant (v3.1+), replace the loop with `DELETE FROM cron.job WHERE jobname LIKE 'campaign_run_%'` filtered by org_id lookup — requires joining against `campaign_runs`. Pre-note for planner.

---

## RESEARCH COMPLETE

Output file: `.planning/phases/11-easy-advanced-crm-campaign-decision/11-RESEARCH-PART-B-campaign.md`
